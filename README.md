# EcoTech — Front-end

Plataforma web de reciclagem para o Rio de Janeiro e a Costa Verde: pessoas ganham EcoCoins ao reciclar em Ecopontos de empresas parceiras e trocam por recompensas. Projeto da Unisuam.

HTML, CSS e JavaScript puro, sem build. Hospedado na Vercel. **Todos os dados vêm da API Laravel** (`js/api.js` é o único ponto de acesso à rede). O navegador guarda só o token e preferências visuais.

## Configuração (`js/config.js`)

| Chave | O que é |
|---|---|
| `AMBIENTES` e `ORDEM` | Onde está a API: cada ambiente tem `nome` e `BASE_URL` (**com** `/api/v1`, sem barra final). Em produção precisa ser HTTPS (a Vercel bloqueia HTTP). A API oficial (Railway) é o ambiente `servidor`, primeiro da `ORDEM`; as locais só entram se ela não responder. |
| `MOSTRAR_STATUS` | `false` (padrão): o usuário não vê selo de conexão nem nome de servidor. A equipe vê abrindo o site com `?status=1` (só naquela aba; `?status=0` esconde). Escondido, o ambiente em uso aparece no console (F12). |
| `CARTO_KEY` | Chave gratuita dos tiles do mapa (https://carto.com/basemaps/apikey). Sem ela o mapa usa o OpenStreetMap e avisa no console. A chave fica visível no navegador: peça uma para o domínio da Vercel e outra para `localhost`. |
| `AVISO_EMAIL` | Quem recebe o e-mail de aviso quando uma empresa gera um Ecoponto no painel (enviado pelo FormSubmit, sem servidor de e-mail). Na 1ª vez chega um e-mail "Activate Form" nesse endereço: clique uma vez para ativar. |
| `GOOGLE_CLIENT_ID` | ID público do OAuth do "Entrar com Google". |

## Logins para avaliação

Com o **servidor-demo** (`servidor-demo/iniciar-demo.bat` ou `.sh`), já existem estas contas (tabela completa em `servidor-demo/LEIA-ME.md`):

| Perfil | Login | Senha | 2FA |
|---|---|---|---|
| Pessoa comum | `DEMOUS` ou demo@ecotech.com | `Demo1234` | mãe: Ana Souza · nascimento: 14/03/1995 · CEP: 20040020 |
| Master | `MASTER` ou master@ecotech.com | `Master123` | mãe: Maria Master · nascimento: 01/01/1980 · CEP: 20040020 |
| Empresa | empresa@ecotech.com | `Empresa123` | não tem 2FA |

Com a API Laravel de verdade, os logins são os do seed da API (`php artisan migrate:fresh --seed`).

## Visual (design system)

- Paleta: #0B0F0D, #1F2A1F, #3E5A3F, #8CA98C, #D9C7A3 e #B08D57, nas variáveis `--cream`, `--sage-*`, `--ink-*`. Fontes: Plus Jakarta Sans (interface) + Lora (títulos); Poppins no login, cadastro, perfil e afilie-se.
- Containers com efeito de inclinação nas páginas com `<html data-efeitos>` (`css/eco-interacoes.css` seção 8 e `js/eco-interacoes.js`; a lista de seletores precisa ser igual nos dois).
- `js/eco-voltar.js`: seta de voltar igual à do login em todas as telas. Volta para a página anterior do site; se não houver, vai para o destino fixo da tela (`DESTINOS`).
- Folhas/flocos/pétalas do topo: a estação vem da data do computador.
- Skeleton loading (`css/eco-skeleton.css` + `js/eco-skeleton.js`) nas telas com dados da API: `class="sk"` no valor, `data-sk-linhas` em tabelas e `data-sk-itens` em listas. Some sozinho quando o dado chega; se a API não responder, some quando não houver mais pedidos pendentes (nunca fica carregando para sempre).
- `afilie_se.html` tem a seção "Conheça o Ecoponto" com o vídeo conceitual `assets/ecoponto-conceito.mp4` (toca sem som quando aparece na tela; com "movimento reduzido" fica parado na capa).

## Ambientes (local e servidor) e apresentação

`js/config.js` lista os ambientes (`local`, `servidor`) e a ordem de tentativa. O front consulta `GET /saude` de cada um, usa o primeiro que responder e, se ele cair, passa para o próximo (se havia alguém logado, pede novo login). Com `?status=1`, um selo no canto inferior esquerdo mostra a conexão (verde = real, amarelo = demonstração, vermelho = sem conexão) e permite trocar à mão (o usuário comum não vê o selo); `?ambiente=local|servidor|auto` fixa a escolha. **`servidor-demo/`** é uma API **simulada** (plano B, dados fictícios, sem MySQL) que roda só com Node. Guia completo, roteiro e lista de conferência: `docs/APRESENTACAO-LOCAL.md`.

## Como rodar

1. Suba a API (`php artisan serve --port=8000`, ambiente `local`) e confira `http://localhost:8000/api/v1/saude`. No `.env` da API, `CORS_ORIGINS` precisa incluir a origem do front (ex.: `http://127.0.0.1:5500`).
2. Ajuste `js/config.js`.
3. Sirva a pasta com qualquer servidor estático (Live Server do VS Code, `python3 -m http.server 5500`). Abra `index.html`.

## Deploy na Vercel

Projeto estático, sem comando de build, diretório raiz. Antes de publicar: o ambiente `servidor` com a URL HTTPS da API, `CARTO_KEY` do domínio de produção, e o domínio da Vercel em `CORS_ORIGINS` da API. A Vercel diferencia maiúsculas de minúsculas nos nomes de arquivo.

## Fluxo do Ecoponto

1. A **empresa** gera a placa em `empresa.html` (QR assinado pelo servidor).
2. A **pessoa** lê o QR em `coleta.html` → a API cria a sessão e registra o check-in.
3. O **Ecoponto** lê os códigos de barras na seção "Leitor do Ecoponto" de `empresa.html` → a API credita a pessoa da sessão.
4. A empresa baixa os dados dos ecopontos em CSV (resumo e histórico de leituras, sem dado pessoal) na seção "Exportar dados" de `empresa.html`.
5. O celular da pessoa mostra saldo e histórico em `leitor.html` ("Sessão no Ecoponto") e em `coleta.html`, atualizando a cada 5 s.

## Estrutura

- `js/api.js` — cliente da API, sessão (token), autenticação, recursos e menu do header. Telas públicas (`index`, `sobre_nos`, `afilie_se`, `login`, `cadastro`, `cadastro_empresarial`, `esqueci_senha`, `error_page`) nunca mandam para o login, nem quando o token vence ou o ambiente da API muda (`PAGINAS_PUBLICAS`). `js/config.js` — endereços e chaves. Erros inesperados (403 e falha do servidor) levam a `error_page.html`; `404.html` também.
- `js/eco-helpers.js` (máscaras e validação de formulário), `js/eco-admin.js` (atalho do master), `js/empresa-data.js` (painel da empresa), `js/eco-map-tiles.js` (mapa), `js/eco-acessibilidade.js` (painel de acessibilidade que abre no botão de tema ☀️/🌙: tema/contraste e tamanho da fonte, em todas as páginas), `js/eco-voltar.js` (seta de voltar), `js/ui-*.js`, `js/eco-animate.js`, `js/eco-interacoes.js`, `js/eco-arte-fundo.js` (interface).
- `servidor-demo/` — servidor de demonstração (API simulada + site estático) para ensaio e plano B; não é o backend do projeto.
- `docs/` — `APRESENTACAO-LOCAL.md` (como rodar tudo local, em servidor e o plano B), `DER.md` e `der.mmd` (banco), `MODELO-LOGICO.md` e `der-logico.mmd` (modelo lógico derivado do front), `BACKEND-ajustes-vindos-do-front.md` (contrato que o front espera da API), `ADERENCIA-ENUNCIADO.md`, relatório de remoção, checklist de testes `MERGE-KAIO.md` (o que veio de cada versão no merge com a branch `kaio`) e `REVISAO-CORRECOES.md` (correções da revisão de 22/11 e o que ficou pendente). `docs/tools/gerar-der.mjs` gera `assets/modelo-bd.svg` e `.png` (imagem do DER) a partir de um `.mmd`.
- Bibliotecas por CDN (versões fixas): Leaflet, ZXing, html5-qrcode, jsPDF 2.5.1 e jsPDF-AutoTable 3.8.2 (PDF da lista de usuários).

## O que fica no navegador

- `ecotech_session` — token e identidade mínima (nome, e-mail, avatar, tipo, perfil). Nunca o saldo.
- `eco-theme` (tema; o padrão é o **claro**), `eco-fonte` (tamanho da fonte do painel de acessibilidade) e `eco_notif` (preferência de notificação): só visuais. A estação das folhas sai da data do computador e não é guardada (a chave antiga `ecotech_estacao` é apagada).
- `sessionStorage`: desafio de 2FA em andamento, sessão do Ecoponto atual (atalho de navegação) e avisos entre telas.
