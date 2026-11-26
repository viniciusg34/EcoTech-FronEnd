# EcoTech — Relatório de remoção (Etapa 5)

Base de comparação: o commit "baseline" do git, feito antes da refatoração. Cada arquivo abaixo foi conferido com `grep` por nome em HTML, JS, CSS e README, **excluindo os próprios candidatos**, antes de apagar.

## 1. Arquivos apagados

| Arquivo | Por quê | Conferência |
|---|---|---|
| `js/eco-api` | Cliente de um backend PHP local; nenhuma página carregava. Substituído por `js/api.js`. | só citado em comentário do `api.js` |
| `js/eco-session.js` | Sessão sem token + menu do header. Substituído por `js/api.js` (mesmas funções globais). | nenhuma página carrega mais |
| `js/auth.js` | Contas locais em localStorage; só o `cadastro_empresarial.html` o carregava. | removido do cadastro |
| `js/ecoponto-modal.js` | Órfão, ainda chamava a MockAPI. | sem referências |
| `js/app-ui.js`, `js/main.js`, `js/map.js`, `js/perfis.js`, `js/scanner.js`, `js/ui-tabs.js` | Órfãos, sem referência em nenhuma página. | sem referências |
| `js/data-map-points.js`, `js/data-rewards.js`, `js/data-scan-products.js`, `js/rewards.js` | Arrays fixos (pontos, recompensas, produtos); só eram usados pelos órfãos acima. Agora vêm da API. | sem referências |
| `css/base.css`, `css/esqueci_senha.css`, `css/login-modal.css` | Sem referência em nenhum HTML ou CSS. | sem referências |
| `Sobre_nos.html` | Cópia idêntica de `sobre_nos.html`. Nenhum link usava a versão com maiúscula (a Vercel diferencia). | `diff` idêntico; sem links |
| `leitor-codigo-barras-coins.html` | Leitor antigo: sem login, saldo falso no localStorage, chamava `/scans` direto. Vale só `leitor.html`. | sem links |
| `testes/limpar-dados-de-teste.html` (pasta `testes/`) | Limpava o localStorage de dados que não existem mais. | sem links |
| `assets/modelo-bd.svg` (versão antiga) | DER do banco antigo (MockAPI). Foi **recriado** com o DER novo (e um `.png`), pois o enunciado pede uma imagem; gerado por `docs/tools/gerar-der.mjs`. | decisão sua |

Total: 20 arquivos da lista de auditoria + o SVG. Nenhum link local quebrado depois da limpeza (verificado em todos os `src`/`href` dos HTML).

## 2. Mantidos que pareciam órfãos ou "obsoletos"

- `js/eco-helpers.js`: mantido; só ficaram máscaras e validações (a busca direta no ViaCEP e as contas locais saíram).
- `js/eco-admin.js`: mantido; só a interface do master (atalho flutuante). Saíram a conta master com senha fixa, o login local e a leitura de logs locais.
- `js/ui-toast.js`, `js/ui-theme.js`: usados por várias páginas.
- `modelo_bd.html`: mantido e reescrito (DER novo).
- `error_page.html`: **não pode ser apagado**. O enunciado exige uma Tela de Erro; ela era uma página de brincadeira sem uso e foi **reescrita** (título, código e mensagem conforme o erro) e ligada ao `api.js` (403 e falha do servidor). `404.html` leva a ela.

## 3. Trechos removidos por página

| Página | Removido |
|---|---|
| `login.html` | decodificação do token do Google no cliente; contas locais e master local (senha fixa); log de login no localStorage; criação automática de conta local do Google |
| `2fa.html` | conferência da resposta no navegador; nome da mãe, nascimento e CEP baixados da API e guardados em sessionStorage; sorteio local de pergunta |
| `esqueci_senha.html` | busca da conta na MockAPI com dados pessoais; verificação local; troca de senha por PUT na MockAPI |
| `alterar_senha.html` | GET/PUT de pessoa na MockAPI com senha em texto puro |
| `cadastro.html` | conta local, checagem de duplicidade no cliente, POST na MockAPI com senha em texto puro; busca de CEP no ViaCEP (agora `GET /cep/{cep}`) |
| `cadastro_empresarial.html` | checagem de e-mail duplicado na MockAPI; POST na MockAPI; `js/auth.js` |
| `perfil.html` | leitura do "primeiro usuário" da MockAPI (nem usava o logado); `getSession` próprio; cálculo de nível, progresso e impacto no cliente; histórico no array do usuário; foto de perfil em localStorage; PUT/DELETE na MockAPI |
| `index.html` | 3 chamadas à MockAPI para estatísticas; arrays fixos de categorias e pontos; tiles sem chave |
| `coleta.html` | MockAPI (pessoa, empresa, ecopontos); `rewardsCatalog` e `productDB` fixos; combinações falsas de categorias por ecoponto; cálculo de coins, saldo e kg no cliente; check-in de 50 coins sem limite; PUT de saldo e de "coletado"; leitura de produto pela pessoa |
| `leitor.html` | consulta direta ao Open Food Facts; saldo e histórico de demonstração (`demoBal`, `hist`); câmera, campo de código e resultado de produto (a tela virou a sessão no Ecoponto) |
| `empresa.html` + `js/empresa-data.js` | MockAPI; última atividade e série mensal inventadas; QR estático feito no navegador (biblioteca QRCode.js) |
| `consulta_usuarios.html`, `logs.html` | listagem e exclusão direto na MockAPI; filtro local; logs do localStorage |
| `afilie_se.html`, `sobre_nos.html` | leitura da MockAPI de empresas; números de reserva falsos (22 ecopontos, 10 empresas, 21.000 kg); formulário de newsletter que usava `alert()` e fingia cadastrar o e-mail (virou link para a inscrição real da Mongabay) |

## 4. O que muda para quem usa (visível)

- Menu "Escanear produto" virou **"Sessão no Ecoponto"**; a pessoa lê só o QR da placa, e quem lê os produtos é o Ecoponto.
- Recuperação de senha não diz mais "não encontramos nenhuma conta com esse e-mail" (a API responde igual para qualquer e-mail).
- O 2FA mantém a mesma pergunta até acabar as tentativas.
- Quem entra com Google sem conta vai ao cadastro com nome e e-mail preenchidos.
- "Cupom McDonald's" (e qualquer nome com apóstrofo) agora resgata; antes quebrava o botão.
- O tema escolhido no perfil agora vale para o site todo (a chave era `eco_theme`; as outras páginas usavam `eco-theme`).
- Os nomes vindos da API passam por escape de HTML (antes, nome com `<` entrava direto no HTML).
- **Barra de acessibilidade** em todas as páginas: contraste (fundo escuro/fonte clara) e tamanho da fonte (A−, A, A+, de 85% a 150%). O texto em `rem` escala; textos com tamanho fixo em `px` (cerca de um terço das declarações) não.
- O tema inicial é sempre o **claro**, mesmo que o aparelho esteja em modo escuro.
- O botão de PDF em Consulta de Usuários **baixa** `usuarios-ecotech.pdf` (todas as páginas da busca, CPF mascarado), em vez de abrir a impressão.
- Falha do servidor (5xx) e acesso negado (403) abrem a tela de erro em vez de um toast. Chamadas silenciosas (checagem de saldo a cada 5 s) nunca redirecionam.
- **Ambientes e conexão:** `js/config.js` ganhou `AMBIENTES`/`ORDEM` (local e servidor); `api.js` sonda `GET /saude`, escolhe o primeiro no ar, troca sozinho se ele cair e mostra um selo de conexão. Novo **`servidor-demo/`** (API simulada, só para ensaio e plano B, com selo amarelo). Em site publicado, endereços de `localhost` são ignorados.
- Em `empresa.html`, o QR mostra o **código** com botão Copiar (reserva se a câmera falhar).
- Em `empresa.html`, nova seção **Exportar dados dos ecopontos**: resumo (do painel) e histórico de leituras (`GET /empresas/me/leituras`) em CSV.
- A newsletter do `sobre_nos.html` virou um link para a página de inscrição da Mongabay (nova aba); a EcoTech não recebe o e-mail.

## 5. Pendente

- Backend: tudo que está em `docs/BACKEND-ajustes-vindos-do-front.md` (endpoints novos, campos, seed de produtos com EAN inválido).
- `CARTO_KEY`, `BASE_URL` e `GOOGLE_CLIENT_ID` reais em `js/config.js`.
- Decisão sobre `error_page.html`.
- Rodar o checklist (`docs/CHECKLIST-TESTES.md`) contra a API real **antes de aceitar esta limpeza**; para reverter, use o commit baseline do git.
