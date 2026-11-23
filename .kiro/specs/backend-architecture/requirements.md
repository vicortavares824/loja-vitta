# Requirements Document

## Introduction

Este documento define o MVP da arquitetura de backend da Loja Vitta: um checkout seguro executado no servidor. Hoje o carrinho calcula subtotal, frete e total no navegador, e `tomatoApi.createOrder` grava `orders` e `order_items` diretamente no Supabase com os valores enviados pelo cliente. Isso permite que um cliente adulterado altere preços, frete, cupom e quantidades.

No MVP, uma Vercel Function na pasta `/api` (mesmo repositório e mesmo deploy) recebe apenas os identificadores dos produtos e as quantidades, busca os preços e o estoque no Supabase, recalcula frete e cupom, cria o pedido e cria a cobrança no Mercado Pago (Pix e cartão). Um webhook do Mercado Pago confirma o pagamento. Depois da migração, somente a API, usando a service role key, cria pedidos.

Fora do escopo: catálogo, categorias, estoque administrativo, autenticação e upload do Cloudinary permanecem como estão, diretamente no Supabase com RLS.

Fatos levantados no código atual:

- Frete: R$ 50,00, gratuito quando o subtotal é maior ou igual a R$ 1.500,00 (`CartDrawer.tsx` e `src/tests/unit/cart.test.ts`).
- Cupons `PRIMEIRACOMPRA` e `VITTA10`: aparecem apenas na documentação (`ARCHITECTURE.md`). Não existe lógica de cupom em `CartContext.tsx`, `CartDrawer.tsx` nem `tomatoApi.ts`. O tipo e o valor do desconto de cada cupom precisam ser confirmados antes da implementação (ver Requisito 4).
- Estoque: a tabela `inventory_items` não existe no banco. O estoque está em `products.stockCount` e `products.inStock`.
- Decisão adiada para o design: reservar o estoque na criação do pedido ou debitar somente após o pagamento confirmado.

## Glossary

- **Checkout_API**: Conjunto de Vercel Functions na pasta `/api` que implementa o checkout seguro.
- **Webhook_Handler**: Vercel Function da Checkout_API que recebe as notificações do Mercado Pago.
- **Pricing_Engine**: Módulo da Checkout_API que calcula subtotal, desconto, frete e total.
- **Stock_Service**: Módulo da Checkout_API que valida e atualiza `products.stockCount` e `products.inStock`.
- **Payment_Gateway**: Módulo da Checkout_API que se comunica com a API do Mercado Pago.
- **Checkout_Client**: Módulo `checkoutService` em `src/services` que chama a Checkout_API por `fetch`.
- **Supabase_Admin_Client**: Cliente Supabase da Checkout_API autenticado com a service role key.
- **Service_Role_Key**: Chave de serviço do Supabase, lida da variável de ambiente `SUPABASE_SERVICE_ROLE_KEY`.
- **MP_Access_Token**: Token de acesso do Mercado Pago, lido da variável `MERCADOPAGO_ACCESS_TOKEN`.
- **Webhook_Secret**: Segredo de assinatura do webhook do Mercado Pago, lido da variável `MERCADOPAGO_WEBHOOK_SECRET`.
- **Checkout_Request**: Corpo da requisição de checkout, contendo itens (identificador do produto, cor, tamanho e quantidade), código de cupom opcional, método de pagamento e endereço de entrega.
- **Order**: Registro da tabela `orders` com seus registros de `order_items`.
- **Order_Status**: Estado do pedido. Valores usados no MVP: `pending_payment`, `processing`, `cancelled`, além dos valores já existentes (`shipped`, `delivered`).
- **Payment_Method**: Forma de pagamento escolhida, `pix` ou `card`.
- **Coupon_Rule**: Regra de desconto de um cupom (código, tipo de desconto, valor e condições), mantida em configuração do servidor.
- **Free_Shipping_Threshold**: Subtotal mínimo de R$ 1.500,00 a partir do qual o frete é gratuito.
- **Shipping_Fee**: Valor fixo de frete de R$ 50,00 aplicado quando o subtotal é menor que o Free_Shipping_Threshold.
- **Authenticated_User**: Usuário com sessão Supabase válida, identificado pelo token de acesso enviado no cabeçalho `Authorization`.
- **Idempotency_Key**: Identificador único enviado pelo cliente para que repetições da mesma tentativa de checkout não gerem pedidos duplicados.

## Requirements

### Requirement 1: Checkout autenticado e validado

**User Story:** Como cliente autenticado, quero finalizar minha compra por uma API segura, para que meu pedido seja criado com valores corretos e protegido contra adulteração.

#### Acceptance Criteria

1. WHEN a Checkout_API recebe uma Checkout_Request com token de acesso válido, THE Checkout_API SHALL identificar o Authenticated_User pelo token e associar o Order ao identificador desse usuário.
2. IF a Checkout_Request não contém token de acesso válido, THEN THE Checkout_API SHALL responder com status HTTP 401 e não criar Order.
3. IF a Checkout_Request usa um método HTTP diferente de POST, THEN THE Checkout_API SHALL responder com status HTTP 405.
4. WHEN a Checkout_API recebe uma Checkout_Request, THE Checkout_API SHALL validar o corpo com um esquema zod que exige ao menos 1 item, quantidade inteira entre 1 e 99 por item, Payment_Method igual a `pix` ou `card` e endereço de entrega não vazio.
5. IF o corpo da Checkout_Request não satisfaz o esquema de validação, THEN THE Checkout_API SHALL responder com status HTTP 400 e uma lista dos campos inválidos, sem criar Order.
6. THE Checkout_API SHALL ignorar quaisquer valores de preço, frete, desconto e total enviados na Checkout_Request e usar somente os valores calculados no servidor.
7. WHEN uma Checkout_Request chega com uma Idempotency_Key já usada pelo mesmo Authenticated_User, THE Checkout_API SHALL retornar o Order e a cobrança criados na primeira requisição, sem criar novo Order.

### Requirement 2: Preços calculados no servidor

**User Story:** Como dono da loja, quero que o servidor busque os preços no banco, para que nenhum cliente consiga comprar por um valor diferente do cadastrado.

#### Acceptance Criteria

1. WHEN a Pricing_Engine calcula um pedido, THE Pricing_Engine SHALL obter o preço unitário de cada item na tabela `products` pelo identificador do produto.
2. THE Pricing_Engine SHALL calcular o subtotal como a soma de preço unitário multiplicado pela quantidade de cada item.
3. THE Pricing_Engine SHALL representar valores monetários em centavos inteiros durante o cálculo, para evitar erros de arredondamento de ponto flutuante.
4. IF um identificador de produto da Checkout_Request não existe na tabela `products`, THEN THE Checkout_API SHALL responder com status HTTP 422 identificando o produto inexistente, sem criar Order.
5. IF a cor ou o tamanho de um item não consta na lista de cores ou de tamanhos do produto, THEN THE Checkout_API SHALL responder com status HTTP 422 identificando o item inválido, sem criar Order.
6. THE Checkout_API SHALL gravar em `order_items` o nome, o preço unitário, a cor, o tamanho e a imagem do produto lidos do banco no momento da compra.

### Requirement 3: Regra de frete

**User Story:** Como cliente, quero que o frete grátis seja aplicado corretamente, para que eu pague o mesmo valor mostrado no carrinho.

#### Acceptance Criteria

1. WHILE o subtotal é menor que o Free_Shipping_Threshold, THE Pricing_Engine SHALL aplicar o Shipping_Fee ao pedido.
2. WHILE o subtotal é maior ou igual ao Free_Shipping_Threshold, THE Pricing_Engine SHALL definir o frete do pedido como R$ 0,00.
3. THE Pricing_Engine SHALL calcular o Free_Shipping_Threshold sobre o subtotal anterior ao desconto de cupom, preservando o comportamento atual do `CartDrawer`.
4. THE Pricing_Engine SHALL calcular o total do pedido como subtotal menos desconto mais frete.

### Requirement 4: Cupons de desconto

**User Story:** Como cliente, quero usar cupons de desconto válidos, para que eu receba a promoção anunciada sem que cupons falsos sejam aceitos.

#### Acceptance Criteria

1. THE Pricing_Engine SHALL manter as Coupon_Rule de `PRIMEIRACOMPRA` e `VITTA10` em um módulo de configuração do servidor.
2. WHEN a Checkout_Request contém um código de cupom, THE Pricing_Engine SHALL comparar o código sem diferenciar maiúsculas de minúsculas e sem espaços nas extremidades.
3. WHEN o código de cupom corresponde a uma Coupon_Rule, THE Pricing_Engine SHALL calcular o desconto conforme essa regra e limitá-lo ao valor do subtotal.
4. IF o código de cupom não corresponde a nenhuma Coupon_Rule, THEN THE Checkout_API SHALL responder com status HTTP 422 e o código de erro `INVALID_COUPON`, sem criar Order.
5. WHERE a Coupon_Rule de `PRIMEIRACOMPRA` está restrita à primeira compra, THE Checkout_API SHALL rejeitar o cupom com o código de erro `COUPON_NOT_ELIGIBLE` quando o Authenticated_User já possui Order com status diferente de `cancelled`.
6. THE Checkout_API SHALL gravar no Order o código do cupom e o valor do desconto aplicado.

### Requirement 5: Validação de estoque

**User Story:** Como dono da loja, quero que o estoque seja verificado no servidor, para que não sejam vendidas peças indisponíveis.

#### Acceptance Criteria

1. WHEN a Checkout_API processa uma Checkout_Request, THE Stock_Service SHALL ler `stockCount` e `inStock` de cada produto no banco.
2. IF `inStock` é falso ou `stockCount` é menor que a quantidade solicitada para algum item, THEN THE Checkout_API SHALL responder com status HTTP 409, o código de erro `INSUFFICIENT_STOCK` e os produtos afetados, sem criar Order.
3. WHEN dois checkouts concorrentes disputam as últimas unidades de um produto, THE Stock_Service SHALL atualizar `stockCount` por operação atômica no banco, de modo que `stockCount` nunca fique negativo.
4. WHEN o Stock_Service reduz `stockCount` para 0, THE Stock_Service SHALL definir `inStock` como falso.
5. WHEN o Stock_Service devolve unidades ao estoque, THE Stock_Service SHALL somar a quantidade a `stockCount` e definir `inStock` como verdadeiro.
6. THE Stock_Service SHALL registrar a baixa de estoque somente em `products.stockCount` e `products.inStock`, sem depender da tabela `inventory_items`.

### Requirement 6: Cobrança Pix e cartão

**User Story:** Como cliente, quero pagar com Pix ou cartão pelo Mercado Pago, para que eu escolha a forma de pagamento mais conveniente.

#### Acceptance Criteria

1. WHEN o Order é criado com Payment_Method `pix`, THE Payment_Gateway SHALL criar um pagamento Pix no Mercado Pago no valor total calculado pelo Pricing_Engine e retornar o código copia-e-cola, a imagem do QR Code e a data de expiração.
2. WHEN o Order é criado com Payment_Method `card`, THE Payment_Gateway SHALL criar um pagamento com cartão no Mercado Pago usando o token do cartão gerado pelo cliente, no valor total calculado pelo Pricing_Engine.
3. THE Payment_Gateway SHALL enviar ao Mercado Pago o identificador do Order como referência externa e a Idempotency_Key como cabeçalho de idempotência.
4. THE Checkout_API SHALL gravar o identificador do pagamento do Mercado Pago no Order.
5. WHEN a cobrança é criada com sucesso, THE Checkout_API SHALL gravar o Order com Order_Status `pending_payment` e responder com status HTTP 201 contendo o identificador do Order e os dados de pagamento.
6. IF o Mercado Pago rejeita a criação da cobrança ou não responde em 10 segundos, THEN THE Checkout_API SHALL desfazer a baixa de estoque feita para o Order, marcar o Order como `cancelled` e responder com status HTTP 502.
7. THE Checkout_API SHALL aceitar do cliente somente o token do cartão, sem receber, registrar ou armazenar número, validade ou código de segurança do cartão.

### Requirement 7: Confirmação por webhook

**User Story:** Como dono da loja, quero que o pagamento seja confirmado pelo webhook do Mercado Pago, para que o pedido só avance após a confirmação real do pagamento.

#### Acceptance Criteria

1. WHEN o Webhook_Handler recebe uma notificação, THE Webhook_Handler SHALL validar a assinatura da notificação usando o Webhook_Secret antes de processar o conteúdo.
2. IF a assinatura da notificação é inválida ou ausente, THEN THE Webhook_Handler SHALL responder com status HTTP 401 e não alterar nenhum Order.
3. WHEN a notificação é válida, THE Webhook_Handler SHALL consultar o pagamento diretamente na API do Mercado Pago pelo identificador informado e usar o status obtido nessa consulta, sem confiar no status contido no corpo da notificação.
4. WHEN o pagamento consultado tem status `approved` e o Order está em `pending_payment`, THE Webhook_Handler SHALL alterar o Order_Status para `processing`.
5. WHEN o pagamento consultado tem status `rejected`, `cancelled` ou `expired` e o Order está em `pending_payment`, THE Webhook_Handler SHALL alterar o Order_Status para `cancelled` e devolver ao estoque as unidades reservadas ou debitadas para o Order.
6. WHEN o Webhook_Handler recebe uma notificação repetida para um pagamento já processado, THE Webhook_Handler SHALL responder com status HTTP 200 sem alterar o Order nem o estoque novamente.
7. IF o valor pago consultado difere do total gravado no Order, THEN THE Webhook_Handler SHALL manter o Order em `pending_payment`, registrar o evento de divergência no log do servidor e responder com status HTTP 200.
8. IF a notificação referencia um pagamento sem Order correspondente, THEN THE Webhook_Handler SHALL registrar o evento no log do servidor e responder com status HTTP 200.
9. WHEN o Webhook_Handler conclui o processamento de uma notificação válida, THE Webhook_Handler SHALL responder com status HTTP 200 em até 5 segundos.

### Requirement 8: Criação de pedidos restrita à API

**User Story:** Como responsável pela segurança, quero que somente a API crie pedidos, para que o cliente não consiga contornar o checkout seguro gravando direto no banco.

#### Acceptance Criteria

1. THE Supabase_Admin_Client SHALL ser a única forma de inserir registros em `orders` e `order_items`.
2. WHEN a migração de segurança é aplicada, THE banco de dados SHALL remover as políticas RLS de INSERT em `orders` e `order_items` que permitem inserção por usuários autenticados ou anônimos.
3. WHEN a migração de segurança é aplicada, THE banco de dados SHALL manter as políticas de SELECT que permitem ao cliente ler seus próprios pedidos e ao administrador ler todos.
4. WHEN a migração de segurança é aplicada, THE banco de dados SHALL restringir o UPDATE de `orders.status` e de `orders.totalAmount` por clientes, permitindo a alteração de status somente a administradores e à service role.
5. WHEN um cliente autenticado tenta inserir diretamente em `orders` ou `order_items` pela chave anônima, THE banco de dados SHALL rejeitar a operação.
6. THE repositório SHALL conter o script SQL da migração em um arquivo versionado, com o script de reversão correspondente.
7. WHEN a migração de segurança é aplicada, THE Checkout_Client SHALL substituir o uso de `tomatoApi.createOrder` no fluxo de checkout do `CartDrawer`.

### Requirement 9: Segredos somente no servidor

**User Story:** Como responsável pela segurança, quero que os segredos fiquem apenas no servidor, para que chaves sensíveis nunca cheguem ao navegador.

#### Acceptance Criteria

1. THE Checkout_API SHALL ler a Service_Role_Key, o MP_Access_Token e o Webhook_Secret exclusivamente de variáveis de ambiente sem o prefixo `VITE_`.
2. THE repositório SHALL listar em `.env.example` os nomes das variáveis do servidor, sem valores reais.
3. IF uma variável de ambiente obrigatória do servidor está ausente quando a Checkout_API inicia uma requisição, THEN THE Checkout_API SHALL responder com status HTTP 500 e o código de erro `SERVER_MISCONFIGURED`, sem expor o nome nem o valor da variável na resposta.
4. THE Checkout_API SHALL omitir Service_Role_Key, MP_Access_Token, Webhook_Secret e dados de cartão de logs e de respostas HTTP.
5. THE código-fonte em `src/` SHALL não conter referências à Service_Role_Key, ao MP_Access_Token nem ao Webhook_Secret.
6. THE Checkout_API SHALL responder erros internos com uma mensagem genérica e um código de erro estável, sem expor stack trace nem mensagens de erro do banco.

### Requirement 10: Fronteiras entre API e front-end

**User Story:** Como desenvolvedor, quero que a API e o front-end tenham fronteiras claras, para que a arquitetura em camadas existente seja preservada.

#### Acceptance Criteria

1. THE Checkout_API SHALL residir na pasta `/api` na raiz do repositório e ser implantada no mesmo deploy da Vercel que o front-end.
2. THE Checkout_API SHALL importar de `src/types` somente tipos, sem importar de `src/services`, `src/context` ou de componentes React.
3. THE Checkout_Client SHALL residir em `src/services` e chamar a Checkout_API por `fetch`, enviando o token de acesso da sessão Supabase no cabeçalho `Authorization`.
4. THE Checkout_Client SHALL respeitar as regras de camadas definidas em `architecture.contract.json`.
5. WHEN a Checkout_API responde com erro, THE Checkout_Client SHALL converter a resposta em um erro tipado contendo o código de erro, e o `CartDrawer` SHALL exibir uma mensagem em português correspondente ao código.
6. WHEN a Checkout_API responde com sucesso, THE Checkout_Client SHALL retornar o identificador do Order e os dados de pagamento, e o `CartDrawer` SHALL limpar o carrinho somente após a criação bem-sucedida do Order.
7. THE Checkout_API SHALL responder com os cabeçalhos CORS restritos à origem do site da loja definida em variável de ambiente.

### Requirement 11: Testes automatizados

**User Story:** Como desenvolvedor, quero testes automatizados das regras do checkout, para que alterações futuras não quebrem preço, frete, cupom, estoque e pagamento.

#### Acceptance Criteria

1. THE repositório SHALL conter testes Vitest para o Pricing_Engine cobrindo subtotal, frete abaixo do limite, frete no limite exato de R$ 1.500,00, frete acima do limite, cupom válido, cupom inválido e desconto limitado ao subtotal.
2. THE repositório SHALL conter testes Vitest para o Stock_Service cobrindo estoque suficiente, estoque insuficiente, produto fora de estoque e devolução de estoque.
3. THE repositório SHALL conter testes Vitest para o Webhook_Handler cobrindo assinatura inválida, pagamento aprovado, pagamento recusado, notificação repetida e divergência de valor.
4. THE repositório SHALL conter testes Vitest para o handler de checkout cobrindo requisição sem autenticação, corpo inválido, produto inexistente, estoque insuficiente, repetição com a mesma Idempotency_Key e criação com sucesso.
5. THE repositório SHALL conter testes Vitest para o Checkout_Client cobrindo envio do cabeçalho `Authorization` e conversão de respostas de erro em erros tipados.
6. THE repositório SHALL conter uma propriedade testada com geração aleatória de itens e quantidades que verifica que o total calculado é igual a subtotal menos desconto mais frete, e que o total nunca é negativo.
7. WHEN os testes são executados, THE suíte de testes SHALL usar o Mercado Pago e o Supabase simulados, sem chamar serviços externos.
