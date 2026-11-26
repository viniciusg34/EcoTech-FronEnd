# Merge: lógica do Vinícius + páginas do Kaio

**Base:** zip "Ecotech-Frontend-final para o kaio" (versão do Vinícius até 22/11, feita sobre o `main` de 06/11).
**Trazido para dentro:** commit `cf5de1a` "Feat/correções" (branch `kaio`, 07/11).

Regra usada: tudo que é **lógica** (API, sessão, validações, regras de senha, o que cada tela busca ou envia) ficou como o Vinícius fez. Tudo que é **visual** nas páginas do Kaio (cores, fontes, efeitos, seta de voltar, textos de tela) foi aplicado por cima.

## O que veio do Kaio

- **CSS de todas as páginas** (`css/*.css`): paleta nova (#0B0F0D, #1F2A1F, #3E5A3F, #8CA98C, #D9C7A3, #B08D57), containers e cards. Entrou inteiro; só o `sobre_nos.css` tinha mudança dos dois lados e juntou sem conflito (o botão `.btn-assinar` do Vinícius continua).
- **Efeito de inclinação dos containers**: `css/eco-interacoes.css`, `js/eco-interacoes.js` e o atributo `data-efeitos` no `<html>` de index, sobre_nos, afilie_se, coleta, perfil, empresa, consulta_usuarios, logs e modelo_bd.
- **Estação das folhas automática** (pela data do computador; o botão de escolher estação saiu): `js/eco-animate.js`, `css/eco-animate.css`.
- **`js/eco-voltar.js`** (novo): seta de voltar igual à do login em todas as telas. Saíram os botões "← Voltar" antigos de alterar_senha, consulta_usuarios, logs, modelo_bd e esqueci_senha. Acrescentado `leitor.html → coleta.html` no mapa de destinos.
- **Login**: campo "Login ou e-mail" (a lógica do Vinícius já aceitava os dois), seta voltando para sobre_nos.
- **Cadastro e cadastro empresarial**: seta voltando para o login (a do empresarial virou o mesmo SVG).
- **Fontes**: links do Google Fonts que o Kaio colocou em index, sobre_nos, afilie_se e perfil.
- **Cores fixas no HTML/JS** trocadas pela paleta nova: ilustração do hero do index, banner de coins da coleta, e também nas partes novas do Vinícius que o Kaio não tinha visto (botão "Escanear um produto" do index, página `leitor.html`, atalho do master em `eco-admin.js`, menu do cabeçalho em `api.js`, barra de acessibilidade).
- `logs.html`: texto "Os registros aparecem aqui após um login com 2FA." (os logs agora vêm da API, não do navegador).
- `assets/logo.svg`.

## O que ficou do Vinícius (o Kaio também tinha mexido, mas é lógica)

- `js/api.js` e `js/config.js` (o Kaio tinha um `api.js` próprio, com cookie e `CONTAS_TESTE`; foi descartado).
- `js/eco-helpers.js`, `js/eco-admin.js`, `js/empresa-data.js` e todos os `<script>` dentro das páginas.
- Regras de formulário: senha com 8+ caracteres, maiúscula, minúscula e número; telefone fixo, número, endereço e razão social **obrigatórios**. Por isso não entraram os "(opcional)" e o "Exatamente 8 letras" do Kaio, nem os atributos `name=` que eram do contrato da API dele.
- Colunas da Consulta de Usuários (Nome, E-mail, CPF, Ação) e o botão que **baixa** o PDF.
- `error_page.html`: o Vinícius reescreveu como Tela de Erro de verdade (pedida no enunciado), então o restyle do Kaio na página antiga não se aplica. Ganhou só a cor nova e a seta.
- Arquivos que o Vinícius apagou e o Kaio tinha editado continuam apagados: `css/base.css`, `css/esqueci_senha.css`, `css/login-modal.css`, `js/eco-session.js`, `js/ecoponto-modal.js`, `testes/`, `Sobre_nos.html`.
- `requireAuth()` no index (o Kaio tinha posto): não entrou. Quem pode ver o quê é decidido pela lógica do Vinícius.
- Link da Política de Privacidade no formulário do sobre_nos: não entrou, porque o Vinícius trocou esse formulário pelo link da newsletter.

## Ajustes feitos durante o merge

- `modelo_bd.html`: o merge automático tinha duplicado o `api.js` antes do `config.js`; corrigido.
- Barra de acessibilidade (`js/eco-acessibilidade.js`):
  - cobria a seta de voltar e o botão de tema no login, cadastro, cadastro empresarial e perfil. Agora esses botões descem junto com a barra;
  - no `esqueci_senha.html` ela aparecia no meio da tela, ao lado do cartão (o `body` era flex em linha). O corpo virou coluna, com a barra no topo e o cartão centralizado;
  - no celular a barra quebra em duas linhas depois de montada e o menu fixo ficava por baixo dela. Agora ela mede de novo quando muda de tamanho.

## Como foi testado

Com o `servidor-demo` (contas do README): todas as páginas abrem sem erro de JavaScript do projeto (o único erro foi o Leaflet, que vem de CDN e não carregou no ambiente de teste, sem internet). Login + 2FA de pessoa (DEMOUS) e master (MASTER), login de empresa, coleta, perfil, alterar senha, consulta de usuários, logs, modelo do BD e painel da empresa funcionando. `node servidor-demo/teste-api.mjs`: 77 ok, 0 falhas.
