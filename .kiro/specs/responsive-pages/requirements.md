# Requirements Document

## Introduction

Este recurso torna todas as páginas e superfícies compartilhadas da loja Vitta Basics totalmente responsivas em viewports de celular, tablet e desktop. A aplicação é um site de e-commerce em React 19 + Vite + Tailwind CSS v4 cujas visões (início, catálogo, categorias, busca, painel administrativo e as páginas de login/cadastro) são renderizadas condicionalmente a partir de um estado `currentTab` em `App.tsx`. Diversas visões já utilizam prefixos responsivos do Tailwind (`sm:`, `md:`, `lg:`) e a navegação já oferece um menu hambúrguer para celular, mas a cobertura responsiva é inconsistente e a página inicial renderiza componentes pesados de animação WebGL/canvas que não estão otimizados para dispositivos pequenos ou de baixo desempenho.

O objetivo é uma base responsiva consistente e verificável: sem overflow horizontal em qualquer largura suportada, tipografia legível, alvos interativos adequados para toque, layouts que se reorganizam (grades, filtros, tabelas, gavetas, modais, formulários) em breakpoints definidos, e efeitos de animação pesada reduzidos ou desabilitados em celular e quando a pessoa usuária prefere movimento reduzido. Este documento define qual deve ser o comportamento responsivo; as escolhas de implementação (classes utilitárias específicas, refatorações de componentes) ficam para a fase de design.

## Glossary

- **Storefront**: A aplicação React de página única da Vitta Basics renderizada a partir de `App.tsx`, incluindo todas as visões renderizadas condicionalmente e os componentes compartilhados.
- **Viewport**: A área visível do navegador, medida pela sua largura e altura em pixels CSS.
- **Mobile_Breakpoint**: Uma largura de Viewport na faixa de 360px a 639px inclusive (celulares em modo retrato).
- **Tablet_Breakpoint**: Uma largura de Viewport na faixa de 640px a 1023px inclusive (celulares grandes em modo paisagem e tablets).
- **Desktop_Breakpoint**: Uma largura de Viewport de 1024px ou maior.
- **Supported_Width_Range**: Qualquer largura de Viewport de 360px a 1920px inclusive.
- **Touch_Target**: Um elemento interativo (botão, link, controle de ícone, campo de formulário, seletor) que a pessoa usuária ativa ao tocar ou clicar.
- **Heavy_Animation_Component**: Um componente de animação baseado em WebGL ou canvas usado pelo Storefront, especificamente `MagicRings`, `Cubes`, `LaserFlow`, `WavesBackground`, `ScrollVelocity`, `ScrollExpand` e `WarpText`.
- **Reduced_Motion_Preference**: A configuração da pessoa usuária exposta pela media query CSS `(prefers-reduced-motion: reduce)`.
- **Navbar**: O componente compartilhado de navegação superior (`Navbar.tsx`), incluindo sua barra de links de desktop, botões de ação e menu hambúrguer de celular.
- **Cart_Drawer**: O componente de painel de carrinho deslizante (`CartDrawer.tsx`).
- **Quick_View_Modal**: O componente de modal de visualização rápida de produto (`ProductQuickViewModal.tsx`).
- **Search_Modal**: O componente de sobreposição de busca (`SearchModal.tsx`).
- **Admin_Panel**: A visão de painel administrativo (`TomatoAdminPanel.tsx`) e seus subpainéis (`InventoryPanel`, `BulkInventoryPanel`, `CategoryAdminPanel`) e widgets.
- **Auth_Page**: Qualquer uma das visões de login e cadastro: `ClientLoginPage`, `AdminLoginPage`, `ClientSignUpPage`, `AdminSignUpPage`.
- **Data_Table**: Uma exibição tabular de registros dentro do Admin_Panel (pedidos, produtos, estoque).
- **Product_Grid**: A grade responsiva de cards de produto renderizada pelo `ProductGrid` e pela página de catálogo.
- **Product_Card**: Um componente individual de tile de produto (`ProductCardModern.tsx`).
- **Horizontal_Overflow**: Uma condição em que o conteúdo da página se estende além da largura da Viewport, causando uma barra de rolagem horizontal não intencional no corpo do documento.

## Requirements

### Requirement 1: Sem overflow horizontal nas larguras suportadas

**User Story:** Como pessoa compradora em qualquer dispositivo, quero que as páginas se ajustem à largura da minha tela, para que eu nunca precise rolar lateralmente para ler o conteúdo.

#### Acceptance Criteria

1. WHILE a largura da Viewport está dentro do Supported_Width_Range, THE Storefront SHALL renderizar cada visão de modo que o scrollWidth do corpo do documento não exceda a largura da Viewport.
2. WHEN uma visão contém um bloco de conteúdo mais largo que a Viewport, THE Storefront SHALL restringir esse bloco à largura da Viewport ou fazer o bloco rolar dentro de seu próprio contêiner, de modo que o scrollWidth do corpo do documento não exceda a largura da Viewport.
3. WHERE uma Data_Table é mais larga que a Viewport, THE Admin_Panel SHALL confinar a rolagem horizontal ao contêiner da Data_Table, de modo que o scrollWidth do corpo do documento não exceda a largura da Viewport.
4. WHILE a largura da Viewport é 360px, THE Storefront SHALL exibir as visões de início, produtos, categorias, busca, admin e Auth_Page de modo que o scrollWidth do corpo do documento não exceda 360px.

### Requirement 2: Comportamento de layout responsivo por breakpoint

**User Story:** Como pessoa compradora, quero que os layouts se adaptem ao tamanho da minha tela, para que o conteúdo seja organizado adequadamente em celulares, tablets e desktops.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Storefront SHALL organizar as regiões de conteúdo principal em uma pilha vertical de coluna única.
2. WHILE a Viewport está dentro do Tablet_Breakpoint, THE Storefront SHALL renderizar o Product_Grid com 2 colunas e os cards de KPI do Admin_Panel com 2 colunas.
3. WHILE a Viewport está dentro do Desktop_Breakpoint, THE Storefront SHALL renderizar o Product_Grid com 3 colunas e os cards de KPI do Admin_Panel com 4 colunas.
4. WHEN a largura da Viewport cruza o limite de 639px/640px ou o limite de 1023px/1024px durante o redimensionamento, THE Storefront SHALL re-renderizar o layout afetado para corresponder ao novo breakpoint em até 200ms sem exigir recarregamento da página.
5. IF o Storefront não consegue resolver um layout para o breakpoint atual, THEN THE Storefront SHALL manter o último layout aplicado e SHALL renderizar cada região de conteúdo principal com seu conteúdo visível, em vez de vazia ou colapsada.

### Requirement 3: Tipografia legível em todos os breakpoints

**User Story:** Como pessoa compradora, quero que o texto seja legível em telas pequenas, para que eu possa ler informações de produto e títulos confortavelmente.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Storefront SHALL renderizar o texto do corpo com um tamanho de fonte computado de ao menos 14px e um line-height computado de ao menos 1.4 vezes o tamanho da fonte.
2. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Storefront SHALL renderizar os títulos de destaque com um tamanho de fonte computado entre 20px e 40px inclusive, de modo que o scrollWidth do corpo do documento não exceda a largura da Viewport.
3. WHEN um elemento de texto contém uma string mais larga que seu contêiner, THE Storefront SHALL quebrar a string em linhas adicionais dentro do contêiner.
4. WHEN um elemento de texto contém um token inquebrável mais largo que seu contêiner, THE Storefront SHALL truncar o token dentro do contêiner e exibir um indicador de truncamento.
5. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Storefront SHALL renderizar o conteúdo de texto de modo que o scrollWidth do corpo do documento não exceda a largura da Viewport.

### Requirement 4: Alvos interativos adequados para toque

**User Story:** Como pessoa compradora usando uma tela de toque, quero que botões e controles sejam fáceis de tocar, para que eu possa interagir sem toques errados.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Storefront SHALL renderizar cada Touch_Target com uma área tocável de ao menos 44px por 44px.
2. WHERE dois Touch_Targets estão adjacentes dentro do Mobile_Breakpoint, THE Storefront SHALL prover ao menos 8px de espaçamento entre as duas áreas tocáveis.
3. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Storefront SHALL manter todo controle de ação principal (adicionar ao carrinho, finalizar compra, enviar, navegar) alcançável dentro da área rolável de sua visão.
4. IF um Touch_Target fosse renderizado com uma área tocável menor que 44px por 44px dentro do Mobile_Breakpoint, THEN THE Storefront SHALL expandir a área tocável do Touch_Target para ao menos 44px por 44px.
5. WHEN uma pessoa usuária toca um Touch_Target dentro do Mobile_Breakpoint, THE Storefront SHALL ativar exatamente um Touch_Target e SHALL NOT ativar um Touch_Target adjacente.

### Requirement 5: Navegação responsiva

**User Story:** Como pessoa compradora em um celular, quero um menu de navegação que caiba na minha tela, para que eu possa me mover entre as páginas facilmente.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint ou do Tablet_Breakpoint abaixo do limite de navegação de desktop, THE Navbar SHALL ocultar a barra de links de desktop inline e exibir o controle de menu hambúrguer.
2. WHILE a Viewport está dentro do Desktop_Breakpoint, THE Navbar SHALL exibir a barra de links de desktop inline e ocultar o controle de menu hambúrguer.
3. WHEN uma pessoa usuária ativa o controle de menu hambúrguer, THE Navbar SHALL exibir a sobreposição de navegação mobile cobrindo a Viewport.
4. WHEN uma pessoa usuária seleciona um item de navegação na sobreposição de navegação mobile, THE Navbar SHALL navegar para a visão selecionada e fechar a sobreposição.
5. WHILE a sobreposição de navegação mobile está aberta, THE Navbar SHALL apresentar todos os itens de navegação dentro da Viewport sem Horizontal_Overflow.

### Requirement 6: Grade de produtos e cards de produto responsivos

**User Story:** Como pessoa compradora navegando no catálogo, quero que os cards de produto redimensionem e se reorganizem, para que eu possa ver os produtos com clareza em qualquer dispositivo.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Product_Grid SHALL exibir um Product_Card por linha.
2. WHILE a Viewport está dentro do Tablet_Breakpoint, THE Product_Grid SHALL exibir dois Product_Cards por linha.
3. WHILE a Viewport está dentro do Desktop_Breakpoint, THE Product_Grid SHALL exibir três Product_Cards por linha.
4. WHILE a Viewport está dentro do Supported_Width_Range, THE Product_Card SHALL conter sua imagem, texto, controles de cor, controles de tamanho e botões de ação dentro do limite do card sem Horizontal_Overflow.
5. WHEN um Product_Card renderiza conjuntos de opções de tamanho ou cor do produto, THE Product_Card SHALL quebrar os controles de opção em linhas adicionais dentro do card quando a largura da linha é excedida.

### Requirement 7: Filtros de catálogo responsivos

**User Story:** Como pessoa compradora em um celular, quero filtros de catálogo que não poluam a tela, para que eu possa focar nos produtos e abrir os filtros quando necessário.

#### Acceptance Criteria

1. WHILE a Viewport está abaixo do Desktop_Breakpoint, THE products view SHALL ocultar o painel lateral de filtros e exibir um controle de alternância de filtro.
2. WHEN uma pessoa usuária ativa o controle de alternância de filtro abaixo do Desktop_Breakpoint, THE products view SHALL revelar o painel de filtros dentro da Viewport sem Horizontal_Overflow.
3. WHILE a Viewport está dentro do Desktop_Breakpoint, THE products view SHALL exibir o painel lateral de filtros ao lado do Product_Grid.
4. WHILE a Viewport está dentro do Mobile_Breakpoint, THE products view SHALL exibir o controle de ordenação e os chips de filtro ativo dentro da largura da Viewport.

### Requirement 8: Painel administrativo responsivo

**User Story:** Como pessoa administradora, quero que o painel administrativo funcione em tablets e celulares, para que eu possa gerenciar a loja longe de um desktop.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Admin_Panel SHALL empilhar os cards de KPI do painel em uma única coluna.
2. WHILE a Viewport está dentro do Supported_Width_Range, THE Admin_Panel SHALL renderizar o controle de navegação por abas de modo que todas as abas sejam alcançáveis, rolando a barra de abas horizontalmente dentro de seu próprio contêiner quando as abas excederem a largura da Viewport.
3. WHERE uma Data_Table excede a largura da Viewport, THE Admin_Panel SHALL habilitar a rolagem horizontal dentro do contêiner da tabela mantendo o layout da página ao redor livre de Horizontal_Overflow.
4. WHEN o Admin_Panel abre um modal de edição de produto dentro do Mobile_Breakpoint, THE Admin_Panel SHALL ajustar o modal dentro da Viewport e permitir a rolagem vertical do conteúdo do modal.
5. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Admin_Panel SHALL empilhar o título do cabeçalho e os controles de ação em um arranjo vertical.

### Requirement 9: Gaveta de carrinho, visualização rápida e modal de busca responsivos

**User Story:** Como pessoa compradora, quero que sobreposições como carrinho, visualização rápida e busca caibam na minha tela, para que eu possa usá-las em qualquer dispositivo.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Cart_Drawer SHALL ocupar a largura total da Viewport.
2. WHILE a Viewport está dentro do Tablet_Breakpoint ou do Desktop_Breakpoint, THE Cart_Drawer SHALL ocupar uma largura máxima fixa de painel ancorada à borda direita da Viewport.
3. WHEN o conteúdo do Cart_Drawer excede a altura da Viewport, THE Cart_Drawer SHALL rolar a lista de itens dentro da gaveta mantendo o cabeçalho e o rodapé de finalização de compra visíveis.
4. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Quick_View_Modal SHALL empilhar a imagem do produto e os detalhes do produto em uma única coluna e caber dentro da Viewport.
5. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Search_Modal SHALL exibir o campo de busca e os resultados dentro da largura da Viewport sem Horizontal_Overflow.
6. WHEN o conteúdo do Quick_View_Modal ou do Search_Modal excede a altura da Viewport, THE Storefront SHALL permitir a rolagem vertical do conteúdo do modal dentro da Viewport.

### Requirement 10: Formulários de autenticação e cadastro responsivos

**User Story:** Como pessoa usuária fazendo login ou se registrando, quero que os formulários caibam na minha tela, para que eu possa inserir meus dados confortavelmente em qualquer dispositivo.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Supported_Width_Range, THE Auth_Page SHALL centralizar o card do formulário dentro da Viewport e restringir o card a uma largura máxima que caiba na Viewport.
2. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Auth_Page SHALL renderizar os campos do formulário e o controle de envio com a largura total do card do formulário.
3. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Auth_Page SHALL renderizar cada campo do formulário com uma altura de área tocável de ao menos 44px.
4. WHEN a Auth_Page exibe uma mensagem de validação ou erro, THE Auth_Page SHALL renderizar a mensagem dentro do card do formulário sem Horizontal_Overflow.

### Requirement 11: Animações pesadas conscientes de desempenho em celular

**User Story:** Como pessoa compradora em um celular ou dispositivo de baixo desempenho, quero que as páginas carreguem e rolem suavemente, para que efeitos visuais pesados não deixem meu dispositivo lento nem descarreguem a bateria.

#### Acceptance Criteria

1. WHILE a Viewport está dentro do Mobile_Breakpoint, THE Storefront SHALL renderizar cada Heavy_Animation_Component em um modo de custo reduzido que diminui sua carga de renderização em relação à apresentação do Desktop_Breakpoint.
2. WHERE a Reduced_Motion_Preference está definida como reduce, THE Storefront SHALL desabilitar a animação contínua de cada Heavy_Animation_Component e apresentar um fallback estático.
3. WHEN um Heavy_Animation_Component é renderizado em modo de custo reduzido ou fallback estático, THE Storefront SHALL preservar o layout do conteúdo ao redor de modo que a visão permaneça livre de Horizontal_Overflow.
4. IF um Heavy_Animation_Component falha ao inicializar, THEN THE Storefront SHALL renderizar a visão ao redor sem a animação e sem Horizontal_Overflow.

### Requirement 12: Metadados responsivos e configuração de viewport corretos

**User Story:** Como pessoa compradora em um celular, quero que a página se ajuste à largura do meu dispositivo por padrão, para que o conteúdo seja dimensionado corretamente no primeiro carregamento.

#### Acceptance Criteria

1. THE Storefront SHALL declarar uma configuração de meta viewport que define a largura do layout para a largura do dispositivo com uma escala inicial de 1.
2. WHEN o Storefront carrega em um dispositivo móvel, THE Storefront SHALL renderizar a visão inicial dimensionada para a largura do dispositivo sem exigir que a pessoa usuária reduza o zoom.
