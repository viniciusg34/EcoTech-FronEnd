# Correções da revisão (22/11)

Revisão feita com as ferramentas do reel (Web Design Guidelines da Vercel, Taste Skill, Awesome Design e Playwright). A de imagem pra código ficou de fora, como o Vinícius pediu.

Regras seguidas: **nenhuma mudança na lógica da API** (`js/api.js`, `js/config.js`, validações e chamadas continuam iguais) e **a barra de acessibilidade continua como está**, porque é item do Desafio Plus.

Os números são os mesmos da revisão.

## Corrigido

| # | Onde | O que mudou |
|---|---|---|
| 1 | `css/empresa.css` | Selo "Em manutenção" legível no container verde (usa `--sun-text`, que muda com o tema). O ponto do selo "Ativo" aparece no fundo verde. Os selos de status não quebram linha. |
| 2 | `css/empresa.css` | O código do ecoponto (`ECO-01`) não quebra mais em duas linhas. |
| 3 | `css/coleta.css` | No celular, o mapa começa abaixo do menu fixo; o título "Mapa dos Pontos de Coleta" aparece. |
| 4 | `login.html`, `cadastro.html`, `alterar_senha.html` (+ CSS) | "Mostrar senha" virou `<button type="button">` com `aria-label`: dá para usar com Tab + Enter. O visual é o mesmo; a área de toque cresceu. O efeito de onda não entra nesses botões (`js/eco-interacoes.js`). |
| 5 | 9 páginas | O `#toast` ganhou `role="status" aria-live="polite"`: o leitor de tela lê os avisos. |
| 6 | `coleta.html` | Campo do código do QR com `aria-label`. |
| 7 | `perfil.html`, `coleta.html`, `sobre_nos.html` | Um `h1` por página: perfil e coleta ganharam um `h1` só para leitor de tela; as abas da coleta viraram `h2` (mesmo visual); "Nossos pilares" virou `h2`. |
| 8 | `index.html` | "Escanear um produto" → "Sessão no Ecoponto" e "Escanear agora" → "Ir para a sessão", de acordo com o fluxo novo. |
| 10 | `js/empresa-data.js` | O botão da tabela de ecopontos agora tem nome ("Gerar QR do ECO-01") e usa "…". Só mudou o texto do botão. |
| 11 | `css/eco-interacoes.css` | Área de toque de 44 px na seta de voltar, no tema, no avatar, nas redes sociais, nos links "Saiba mais", em "Esqueceu sua senha?" e nos botões da tabela, sem mudar o desenho. |
| 12 | `css/admin-shared.css` | Anel de foco nos campos das telas do painel (alterar senha, consulta, logs). |
| 15 | 8 páginas | "Entrando...", "Salvando..." etc. → "…". |
| 16 | `perfil.html` | O botão de tema mostra o mesmo ícone que as outras páginas (☀️ no claro, 🌙 no escuro). |
| 17 | `error_page.html` | Selo "Erro 500" com contraste suficiente. |

## Ficou para o Vinícius decidir

- **9. Números fixos**: "98% de eficiência" (index e sobre nós) e "85% de eficiência" (login). Estão no código e não vêm da API. Tirar mexe no visual e no script do sobre nós, então fica a decisão dele.
- **Pontos de gosto**: efeito de inclinação, cards que aparecem ao rolar, emojis como ícones e três fontes diferentes.
- **11 (parte)**: botões com efeito de onda (fechar janela 32 px, tela cheia do mapa, abas da coleta com 30 px de altura, olho do cadastro empresarial) continuam menores que 44 px. Aumentar muda o desenho.
- **7 (parte)**: sobre nós e afilie-se ainda pulam nível de título dentro dos cards (`h1` → `h3`, `h2` → `h4`). Trocar exige ajustar o CSS desses cards.
- **13 e 14**: `meta description`, link "pular para o conteúdo" e medidas nas imagens.

## Como foi conferido

Prints de todas as páginas antes e depois (1280 px e 375 px, contas de pessoa, master e empresa), comparados pixel a pixel. Só mudaram os pontos acima. A tabela de logs aumentou porque cada teste cria um login novo. Também foram conferidos o Tab + Enter no "mostrar senha", o toque 3 px fora dos botões e o `aria-live` dos avisos.

## Ajustes pedidos depois da revisão

- `index.html` / `css/index.css`: espaçamento do topo da página igual entre as partes: formulário → 16 px → botão "Sessão no Ecoponto" → 24 px → selos. O estilo do botão saiu do HTML e foi para a classe `.btn-scan`, que ganhou efeito ao passar o mouse.
- `css/login.css` / `css/cadastro.css`: o campo em foco tem de novo um contorno visível em volta. No container verde o contorno antigo (verde 12%) sumia no fundo; agora ele usa `--sage-400`, que aparece nos dois temas.
