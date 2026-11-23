# Implementation Plan: backend-architecture

## Overview

O plano segue a ordem de dependência do design: tipos e contrato de camadas, migração SQL com rollback, módulos compartilhados em `api/_lib`, rotas (`quote`, `checkout`, webhook e cron), `checkoutService` com ajustes no `CartContext` e no `CartDrawer`, configuração de ambiente e, por fim, os testes Vitest. A linguagem é TypeScript, a mesma do projeto. As tarefas só de teste são opcionais (`*`). Cada propriedade de correção do design é uma sub-tarefa própria.

Pendências que não bloqueiam o código, mas bloqueiam o uso de cupons em produção: os valores de `PRIMEIRACOMPRA` e `VITTA10` estão **A CONFIRMAR PELO DONO DA LOJA**. A tarefa 4.4 cria as regras com `confirmed: false`, sem inventar valores.

## Tasks

- [x] 1. Preparar dependências, tipos e contrato de camadas
  - [x] 1.1 Adicionar dependências e configuração TypeScript da pasta `api`
    - Adicionar `zod` em `dependencies`, e `fast-check` e `@vercel/node` em `devDependencies` no `package.json`
    - Criar `api/tsconfig.json` (lib ES2023, types node, moduleResolution bundler, strict)
    - _Requisitos: 9.1, 10.1_

  - [x] 1.2 Criar os tipos de contrato do checkout
    - Criar `src/types/checkout.ts` com `PaymentMethod`, `CheckoutItemInput`, `CardPaymentInput`, `CheckoutRequest`, `PricingBreakdown`, `PixPaymentData`, `CardPaymentData`, `CheckoutResponse`, `QuoteRequest`, `QuoteResponse`, `CheckoutErrorCode` e `ApiErrorBody` (somente interfaces e uniões, sem imports)
    - Adicionar `'pending_payment'` a `Order.status` em `src/types/ecommerce.ts`
    - _Requisitos: 1.4, 6.5, 10.2_

  - [x] 1.3 Atualizar `architecture.contract.json`
    - Adicionar a camada `api` (`api/**`) com `allowedDependencies: ["types"]`
    - Adicionar, como mudança opcional, a camada `config` (`src/config/**`) e permiti-la em `services`
    - _Requisitos: 10.2, 10.4_

- [x] 2. Criar a migração SQL e o rollback
  - [x] 2.1 Criar `supabase/migrations/20261122000000_secure_checkout.sql`
    - Novas colunas em `orders` (`subtotalAmount`, `discountAmount`, `shippingAmount`, `idempotency_key`, `request_hash`, `payment_id`, `expires_at`, `paid_at`, `cancel_reason`, `needs_review`), índices únicos e `orders_status_check` com `pending_payment`
    - Remover as políticas de INSERT em `orders` e `order_items`, aplicar `REVOKE` para `anon` e `authenticated`, e manter as políticas de SELECT
    - Trigger `orders_guard_update` que restringe o UPDATE de clientes e administradores a `status` e às transições operacionais
    - RPCs `create_order_reserving_stock`, `release_order_stock`, `confirm_order_payment` e `attach_order_payment`, com `EXECUTE` somente para `service_role`
    - Conferir no banco real e em `20260815231300_schema.sql` e `20260829000000_security_fixes.sql` os nomes das políticas e os privilégios antes de finalizar
    - _Requisitos: 1.7, 2.6, 4.6, 5.3, 5.4, 5.5, 5.6, 6.4, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 2.2 Criar `supabase/rollback/20261122000000_secure_checkout.down.sql`
    - Remover RPCs, trigger e função de guarda, restaurar políticas de INSERT e privilégios, remover constraint, índices e colunas
    - Incluir o aviso de exportar dados e de liberar pedidos `pending_payment` antes de reverter
    - Conferir o texto das políticas originais nas migrações anteriores
    - _Requisitos: 8.6_

  - [ ]* 2.3 Escrever os testes de integração SQL em `supabase/tests/secure_checkout.sql`
    - INSERT negado para `anon` e `authenticated`, permitido para `service_role`, e SELECT restrito ao próprio cliente
    - Concorrência pela última unidade, `stockCount` nunca negativo, `inStock` falso ao zerar e restaurado na devolução
    - `order_items` com nome, preço, cor, tamanho e imagem vindos de `products`
    - Ciclo migração, reversão e migração sem erro
    - _Requisitos: 2.6, 5.1, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 3. Checkpoint - Banco e tipos
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar os módulos compartilhados em `api/_lib`
  - [x] 4.1 Criar `errors.ts`, `logger.ts` e `env.ts`
    - `AppError` com catálogo de códigos, status e mensagem fixa por código
    - Logger JSON com redação por nome de chave (`authorization`, `token`, `access_token`, `service_role`, `secret`, `card`, `cvv`, `number`, `x-signature`) e por valor das variáveis de segredo
    - `env.ts` com validação lazy por zod: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SITE_URL`, `CRON_SECRET` (só no cron) e `PIX_EXPIRATION_MINUTES` (padrão 30). Variável ausente lança `SERVER_MISCONFIGURED` e o nome vai só para o log
    - _Requisitos: 9.1, 9.3, 9.4, 9.6_

  - [x] 4.2 Criar `http.ts` e `rateLimit.ts`
    - `route()` com tratamento de `OPTIONS` (204), 405 com `Allow`, CORS restrito a `SITE_URL` com `Vary: Origin`, `X-Request-Id`, conversão de `AppError` e de erro inesperado em `500 INTERNAL_ERROR` genérico
    - Rate limit em memória por janela deslizante (checkout 10/min por usuário, quote 30/min por usuário, 60/min por IP) com 429 e `Retry-After`
    - _Requisitos: 1.3, 9.6, 10.7_

  - [x] 4.3 Criar `supabase.ts`, `auth.ts` e `schemas.ts`
    - `createAdminClient(env)` com a service role key
    - `auth.ts` que extrai `Bearer`, valida com `auth.getUser` e devolve id, e-mail e nome; falha vira `UNAUTHENTICATED` (401)
    - `schemas.ts` com `checkoutSchema` (`.strip()` na raiz, `itemSchema` `.strict()`, `card` obrigatório para cartão) e `quoteSchema`, ligados aos tipos com `satisfies z.ZodType<...>`, além da validação do cabeçalho `Idempotency-Key` (UUID v4)
    - _Requisitos: 1.1, 1.2, 1.4, 1.5, 1.6, 6.7_

  - [x] 4.4 Criar a configuração de frete e cupons e o `pricing/engine.ts`
    - `config/shipping.ts` com `SHIPPING_FEE_CENTS = 5000` e `FREE_SHIPPING_THRESHOLD_CENTS = 150000`
    - `config/coupons.ts` com `PRIMEIRACOMPRA` e `VITTA10` com `confirmed: false`, valores nulos e comentários **A CONFIRMAR PELO DONO DA LOJA**
    - `calculatePricing()` pura em centavos (validação de produto e variante, subtotal, cupom limitado ao subtotal, frete sobre o subtotal antes do cupom, total) e `normalizeCouponCode()`
    - Cupom sem regra ativa resulta em `INVALID_COUPON`; `firstPurchaseOnly` com pedido prévio resulta em `COUPON_NOT_ELIGIBLE`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.5 Criar `payments/webhookSignature.ts` e `payments/mercadoPago.ts`
    - `verifyMercadoPagoSignature()` com manifesto `id:...;request-id:...;ts:...;`, HMAC-SHA256 e `timingSafeEqual`, retornando `false` para entrada ausente ou malformada
    - Cliente Mercado Pago por `fetch` injetável (`createPixPayment`, `createCardPayment`, `getPayment`, `cancelPayment`) com `AbortController` de 10 s (4 s no `getPayment`), `X-Idempotency-Key`, `external_reference`, `notification_url` e corpo montado campo a campo (lista branca)
    - Conferir na documentação do Mercado Pago o formato do manifesto e o de `date_of_expiration`
    - _Requisitos: 6.1, 6.2, 6.3, 6.6, 6.7, 7.1, 7.3_

  - [x] 4.6 Criar `orders/stateMachine.ts`
    - `decidePaymentTransition()` pura com a tabela de decisão do design (`confirm`, `release`, `ignore`)
    - _Requisitos: 7.3, 7.4, 7.5, 7.7_

  - [x] 4.7 Criar `stock/stockService.ts`
    - `reserveAndCreateOrder()` chamando a RPC `create_order_reserving_stock` e mapeando `INSUFFICIENT_STOCK` (com `details.products`), `PRICE_CHANGED`, `IDEMPOTENCY_KEY_REUSED`, `TOO_MANY_PENDING_ORDERS` e `IDEMPOTENT_RACE` para `AppError`
    - `releaseOrderStock()` chamando `release_order_stock`
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.8 Criar `orders/orderService.ts` e `orders/expire.ts`
    - Leitura do catálogo e de `hasPriorOrder` (pedido do usuário com status diferente de `cancelled`)
    - `createCheckout()`: hash da requisição, reserva, cobrança Pix ou cartão, `attach_order_payment`, compensação com `release_order_stock` em `try/finally`, e recusa imediata de cartão como `PAYMENT_REJECTED`
    - Repetição idempotente: reconstruir a resposta, retomar pedido sem `payment_id` e tratar pedido cancelado
    - `expireStaleOrders()` com `now()` injetável, limite de 25 pedidos, consulta ao Mercado Pago antes de cancelar e liberação sem `payment_id`
    - _Requisitos: 1.1, 1.7, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.5_

- [x] 5. Implementar as rotas da API
  - [x] 5.1 Criar `api/quote.ts` (`POST /api/quote`)
    - Autenticar, validar com `quoteSchema`, ler catálogo e `hasPriorOrder`, chamar `calculatePricing()` e responder `QuoteResponse` sem efeitos colaterais
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 3.4, 4.3_

  - [x] 5.2 Criar `api/checkout.ts` (`POST /api/checkout`)
    - Ordem: `route()`, rate limit, ambiente, autenticação, validação (corpo e `Idempotency-Key`), `createCheckout()`, resposta 201 (200 em repetição)
    - Disparar `expireStaleOrders()` preguiçoso (limite de 5, `waitUntil`) fora do caminho crítico
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.4, 2.5, 4.4, 5.2, 6.5, 6.6_

  - [x] 5.3 Criar `api/webhooks/mercadopago.ts`
    - Verificar a assinatura (401 sem alterar nada), ignorar tipos diferentes de `payment`, consultar o pagamento no Mercado Pago, localizar o pedido por `external_reference` e `payment_id`, decidir com `decidePaymentTransition()` e chamar `confirm_order_payment` ou `release_order_stock`
    - Pedido inexistente e divergência de valor: log e 200. Falha transitória: 500. Responder em até 5 s
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 5.4 Criar `api/cron/expire-orders.ts`
    - `GET` protegido por `Authorization: Bearer <CRON_SECRET>` (401 sem ele), chamando `expireStaleOrders()` e respondendo `{ expired, confirmed }`
    - _Requisitos: 5.5, 7.5_

- [x] 6. Checkpoint - API completa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implementar o `checkoutService` e ajustar `CartContext` e `CartDrawer`
  - [x] 7.1 Criar `src/services/checkoutService.ts`
    - `CheckoutError` com `code`, `status`, `details` e mensagens em pt-BR por código (`CHECKOUT_ERROR_MESSAGES_PT`)
    - `quote()`, `createCheckout()` (cabeçalhos `Authorization: Bearer` e `Idempotency-Key`) e `getOrderStatus()` (leitura do próprio pedido protegida por RLS)
    - Sem sessão lança `UNAUTHENTICATED` sem chamar a rede; falha de rede vira `NETWORK_ERROR`; corpo ilegível ou código desconhecido vira `INTERNAL_ERROR`
    - _Requisitos: 10.3, 10.4, 10.5, 10.6_

  - [x] 7.2 Ajustar `src/context/CartContext.tsx`
    - Adicionar `shipping` (50, ou 0 quando o subtotal é maior ou igual a 1500 e o carrinho não está vazio) e `total = subtotal + shipping` como estimativa de exibição, sem importar de `api/`
    - Atualizar `src/tests/unit/cart.test.ts` se algum teste existente depender de `total = subtotal`
    - _Requisitos: 3.1, 3.2, 3.4, 10.2_

  - [x] 7.3 Ajustar `src/components/CartDrawer.tsx`
    - Remover `tomatoApi.createOrder` e o payload com `price`, `productName`, `totalAmount`, `customerName` e `customerEmail`
    - Montar `CheckoutRequest` (`productId`, `color`, `size`, `quantity`, cupom, método, endereço) e chamar `checkoutService.createCheckout`
    - Adicionar campo de cupom (usa `quote` e mostra desconto e total do servidor), escolha Pix ou cartão, campo de endereço obrigatório e Card Payment Brick para o token do cartão
    - `Idempotency-Key` em `useRef`, renovada após sucesso, `PRICE_CHANGED`, `INSUFFICIENT_STOCK` ou mudança no carrinho, e mantida em `NETWORK_ERROR`
    - Limpar o carrinho somente após a resposta de sucesso; Pix exibe QR, copia-e-cola e validade, com polling de `getOrderStatus` a cada 5 s; erros exibem a mensagem pt-BR via `showToast`
    - Trocar o texto "registrado com sucesso na TomatoPHP API" por texto de pagamento pendente ou confirmado
    - _Requisitos: 8.7, 10.3, 10.5, 10.6_

- [x] 8. Configurar ambiente, Vercel e Vitest
  - [x] 8.1 Atualizar `.env.example`
    - Adicionar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SITE_URL`, `CRON_SECRET`, `PIX_EXPIRATION_MINUTES` e `VITE_MERCADOPAGO_PUBLIC_KEY`, sem valores reais e sem prefixo `VITE_` nas variáveis do servidor
    - _Requisitos: 9.1, 9.2_

  - [x] 8.2 Atualizar `vercel.json`
    - Rewrite do SPA para `/((?!api/).*)`
    - `functions` com `maxDuration` 20 para `api/checkout.ts` e 10 para `api/webhooks/mercadopago.ts`
    - `crons` para `/api/cron/expire-orders` a cada 10 minutos (no plano Hobby a Vercel limita a execução diária; a expiração preguiçosa cobre o intervalo)
    - CSP com `https://sdk.mercadopago.com` em `script-src`, `https://api.mercadopago.com` e `https://*.mercadolibre.com` em `connect-src`, e `https://*.mercadopago.com` em `frame-src`, conferidos na documentação do Mercado Pago
    - _Requisitos: 10.1_

  - [x] 8.3 Ajustar a configuração do Vitest para `api/_tests`
    - Confirmar que os testes de `api/_tests/` com `// @vitest-environment node` são descobertos e que `src/tests/setup.ts` não falha fora do jsdom. Se falhar, tornar o setup tolerante ou configurar o ambiente por arquivo, sem alterar o comportamento dos testes atuais
    - _Requisitos: 11.7_

- [ ] 9. Escrever os testes Vitest
  - [ ]* 9.1 Criar os utilitários de teste em `api/_tests/helpers/`
    - `FakeDb` em memória que reproduz a semântica das RPCs (reserva, liberação, confirmação), `fetch` simulado do Mercado Pago, `auth.getUser` simulado e fábricas de catálogo e pedido
    - _Requisitos: 11.7_

  - [ ]* 9.2 Escrever testes unitários do Pricing_Engine em `api/_tests/pricing.test.ts`
    - Subtotal, frete abaixo do limite, no limite exato e acima (`149999`, `150000`, `150001`), cupom válido (regra de fixture injetada), cupom inválido, desconto limitado ao subtotal, `PRIMEIRACOMPRA` com e sem pedido prévio
    - _Requisitos: 3.1, 3.2, 3.3, 4.2, 4.3, 4.4, 4.5, 11.1_

  - [ ]* 9.3 Escrever teste de propriedade para a validação do corpo em `api/_tests/schemas.property.test.ts`
    - **Property 1: Validação do corpo do checkout**
    - **Validates: Requirements 1.4, 1.5**

  - [ ]* 9.4 Escrever teste de propriedade para campos de preço do cliente em `api/_tests/clientFields.property.test.ts`
    - **Property 2: Campos de preço do cliente são ignorados**
    - **Validates: Requirements 1.6, 2.1**

  - [ ]* 9.5 Escrever teste de propriedade para os invariantes do cálculo em `api/_tests/pricing.invariants.property.test.ts`
    - **Property 3: Invariantes do cálculo de preço**
    - **Validates: Requirements 2.2, 2.3, 3.4, 4.3, 11.6**

  - [ ]* 9.6 Escrever teste de propriedade para a regra de frete em `api/_tests/pricing.shipping.property.test.ts`
    - **Property 4: Regra de frete**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 9.7 Escrever teste de propriedade para produto e variante em `api/_tests/pricing.validation.property.test.ts`
    - **Property 5: Validação de variante e de produto**
    - **Validates: Requirements 2.4, 2.5**

  - [ ]* 9.8 Escrever teste de propriedade para normalização de cupom em `api/_tests/coupon.property.test.ts`
    - **Property 6: Normalização e rejeição de cupom**
    - **Validates: Requirements 4.2, 4.4**

  - [ ]* 9.9 Escrever testes unitários do Stock_Service em `api/_tests/stockService.test.ts`
    - Estoque suficiente, insuficiente (409 com produtos afetados), produto fora de estoque e devolução de estoque
    - _Requisitos: 5.1, 5.2, 5.4, 5.5, 11.2_

  - [ ]* 9.10 Escrever teste de propriedade para a assinatura do webhook em `api/_tests/webhookSignature.property.test.ts`
    - **Property 7: Verificação da assinatura do webhook**
    - **Validates: Requirements 7.1**

  - [ ]* 9.11 Escrever teste de propriedade para a decisão de transição em `api/_tests/stateMachine.property.test.ts`
    - **Property 8: Decisão de transição do pagamento**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.7**

  - [ ]* 9.12 Escrever teste de propriedade para a idempotência de notificações em `api/_tests/webhook.idempotency.property.test.ts`
    - **Property 9: Repetição de notificações é idempotente**
    - **Validates: Requirements 7.6**

  - [ ]* 9.13 Escrever testes unitários do Webhook_Handler em `api/_tests/webhook.test.ts`
    - Assinatura inválida (401 sem alteração), pagamento aprovado, recusado, notificação repetida, divergência de valor, pedido inexistente e tipo diferente de `payment`
    - _Requisitos: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7, 7.8, 11.3_

  - [ ]* 9.14 Escrever testes do cliente Mercado Pago e teste de propriedade em `api/_tests/mercadoPago.test.ts`
    - **Property 10: Corpo enviado ao Mercado Pago**
    - **Validates: Requirements 6.1, 6.3, 6.7**
    - Exemplos de sucesso, 4xx, 5xx, erro de rede e abort por timeout
    - _Requisitos: 6.1, 6.2, 6.3, 6.6, 6.7_

  - [ ]* 9.15 Escrever teste de propriedade para a compensação de falha em `api/_tests/checkout.compensation.property.test.ts`
    - **Property 11: Falha do Mercado Pago libera a reserva**
    - **Validates: Requirements 6.6**

  - [ ]* 9.16 Escrever testes unitários do handler de checkout em `api/_tests/checkout.handler.test.ts`
    - Sem autenticação, método GET, corpo inválido, produto inexistente, estoque insuficiente, repetição com a mesma `Idempotency-Key` (mesmo corpo e corpo diferente) e criação com sucesso (Pix e cartão)
    - _Requisitos: 1.1, 1.2, 1.3, 1.5, 1.7, 2.4, 5.2, 6.5, 11.4_

  - [ ]* 9.17 Escrever teste de propriedade para variável de ambiente ausente em `api/_tests/env.test.ts`
    - **Property 12: Variável de ambiente ausente**
    - **Validates: Requirements 9.3**

  - [ ]* 9.18 Escrever testes de propriedade para segredos e erros internos em `api/_tests/logger.property.test.ts` e `api/_tests/errors.property.test.ts`
    - **Property 13: Nenhum segredo nem detalhe interno sai do servidor**
    - **Validates: Requirements 9.4, 9.6**

  - [ ]* 9.19 Escrever teste de propriedade para CORS em `api/_tests/cors.property.test.ts`
    - **Property 14: CORS restrito à origem da loja**
    - **Validates: Requirements 10.7**

  - [ ]* 9.20 Escrever testes unitários da expiração e do cron em `api/_tests/expire.test.ts`
    - Pedido expirado sem pagamento, expirado com pagamento aprovado no limite, cancelamento best effort no Mercado Pago, e cron sem `CRON_SECRET` (401)
    - _Requisitos: 5.5, 7.5_

  - [ ]* 9.21 Escrever testes unitários do `checkoutService` em `src/tests/unit/checkoutService.test.ts`
    - Envio do cabeçalho `Authorization`, ausência de sessão sem chamada de rede, conversão de erros em `CheckoutError`, `NETWORK_ERROR` e corpo ilegível
    - _Requisitos: 10.3, 10.5, 11.5_

  - [ ]* 9.22 Escrever teste de propriedade para erros tipados em pt-BR em `src/tests/unit/checkoutService.property.test.ts`
    - **Property 15: Erros da API viram erros tipados em pt-BR**
    - **Validates: Requirements 10.5**

  - [ ]* 9.23 Escrever testes do `CartDrawer` em `src/tests/unit/CartDrawer.test.tsx`
    - O carrinho só é limpo após sucesso, a mensagem pt-BR aparece por código de erro e a `Idempotency-Key` é renovada em `PRICE_CHANGED` e `INSUFFICIENT_STOCK`
    - _Requisitos: 10.5, 10.6_

  - [ ]* 9.24 Escrever testes de fumaça de fronteiras em `api/_tests/boundaries.test.ts`
    - `api/**` importa de `src/types` somente com `import type`; `src/**` não cita `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` nem `MERCADOPAGO_WEBHOOK_SECRET`; `CartDrawer` não usa `tomatoApi.createOrder`; toda regra de cupom com `confirmed: true` tem tipo e valor preenchidos; `.env.example` lista as variáveis do servidor
    - _Requisitos: 4.1, 8.7, 9.2, 9.5, 10.2, 10.4_

- [x] 10. Checkpoint final - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas em um MVP mais rápido.
- Cada tarefa referencia requisitos específicos para rastreabilidade.
- Os testes de propriedade usam `fast-check` com no mínimo 100 iterações e o comentário `Feature: backend-architecture, Property N: <título>`.
- Os testes de `api/_tests/` usam `// @vitest-environment node` e nunca chamam serviços externos.
- Os testes SQL (tarefa 2.3) rodam manualmente com a Supabase CLI local antes do deploy.
- Os valores dos cupons `PRIMEIRACOMPRA` e `VITTA10` dependem da confirmação do dono da loja. Até lá, o servidor responde `INVALID_COUPON`.
- Este fluxo cria apenas os artefatos de planejamento. A implementação começa pela execução das tarefas.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["3"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 6, "tasks": ["4.7"] },
    { "id": 7, "tasks": ["4.8"] },
    { "id": 8, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 9, "tasks": ["6"] },
    { "id": 10, "tasks": ["7.1", "7.2"] },
    { "id": 11, "tasks": ["7.3", "8.1", "8.2", "8.3"] },
    { "id": 12, "tasks": ["9.1"] },
    { "id": 13, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9", "9.10", "9.11", "9.12", "9.13", "9.14", "9.15", "9.16", "9.17", "9.18", "9.19", "9.20"] },
    { "id": 14, "tasks": ["9.21", "9.22", "9.23", "9.24"] },
    { "id": 15, "tasks": ["10"] }
  ]
}
```
