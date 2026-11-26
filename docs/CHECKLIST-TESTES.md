# EcoTech — Checklist de testes manuais (contra a API real)

Faça nesta ordem **antes de aceitar a limpeza**. Preparação: API rodando em HTTPS (ou local), `js/config.js` ajustado, banco com o seed, uma conta de pessoa, uma de empresa e o master. Abra o console do navegador (F12) e confira que **não há erro vermelho** em nenhuma tela; na aba Rede, todas as chamadas devem ir para a `BASE_URL`.

Marque `[x]` ao passar. Se algo falhar, anote a tela, o passo e a mensagem.

## Cadastro
- [ ] **Pessoa:** preencher as 3 abas; CEP preenche o endereço sozinho; enviar. Esperado: mensagem de sucesso e redirecionamento (login ou início).
- [ ] CEP inexistente mostra "CEP não encontrado"; sem rede mostra a mensagem de preencher à mão.
- [ ] E-mail, CPF ou login repetido: toast com a mensagem da API e o campo marcado (a aba certa abre).
- [ ] Senha fraca / login com menos de 6 letras / CPF inválido: bloqueados antes de enviar.
- [ ] **Empresa:** CNPJ, e-mail único, senha; sucesso leva ao login. E-mail repetido mostra erro.

## Login e 2FA
- [ ] Senha errada: mensagem da API, botão volta a "Entrar".
- [ ] Pessoa: login leva ao 2FA com **uma pergunta** (mãe, nascimento ou CEP); máscara correta no campo.
- [ ] Resposta certa entra (comum → `coleta.html`; master → `perfil.html`). "Lembrar-me" mantém a sessão ao fechar o navegador.
- [ ] 3 respostas erradas: mensagem de bloqueio e volta ao login; a nova tentativa pede outro desafio.
- [ ] Empresa: entra direto em `empresa.html`, sem 2FA.
- [ ] Muitas tentativas de login seguidas: mensagem amigável de limite (429).
- [ ] **Google:** com conta → entra; sem conta → cadastro com nome e e-mail preenchidos.
- [ ] Sair da conta (menu do avatar) volta ao login; voltar com a seta não reabre página protegida.
- [ ] Token inválido (apague-o na API ou espere expirar): a próxima ação mostra "sessão expirada" e leva ao login.

## Recuperar e alterar senha
- [ ] E-mail **existente** e **inexistente** se comportam igual (mesma tela com pergunta).
- [ ] Resposta certa → nova senha → sucesso → login com a senha nova funciona; a antiga não.
- [ ] 3 erros: volta ao login. Senha fraca ou confirmação diferente: bloqueado.
- [ ] `alterar_senha.html`: senha atual errada mostra a mensagem da API; certa altera. Master vê o aviso de que não altera por aqui.

## Mapa (`index.html` e `coleta.html`)
- [ ] O mapa carrega **sem** a marca "API KEY REQUIRED" (com `CARTO_KEY`) e mostra todos os ecopontos do seed (22).
- [ ] Legenda: desmarcar uma categoria esconde só os pontos que não têm outra categoria marcada.
- [ ] Popup: nome, código, status, categorias, kg coletado e "Abrir Rota" funcionam.
- [ ] Tema claro e escuro trocam o mapa. "Mais próximo" (localização) mostra a distância.
- [ ] Números do hero (toneladas, membros, ecopontos) vêm da API; se `/estatisticas` não existir, ficam "—".

## Conexão com o Ecoponto (pessoa)
- [ ] Em `empresa.html` (empresa), gerar o QR de um ponto e abrir/baixar/imprimir a placa.
- [ ] Em `coleta.html` (pessoa), ler o QR com a câmera **ou** colar o código: aparece "Check-in em …" com as moedas da API.
- [ ] Repetir logo em seguida: respeita o cooldown (mensagem da API, sem moedas novas).
- [ ] QR adulterado/outro texto: "QR inválido". Código de barras de produto: "não é o QR de um Ecoponto".
- [ ] Botão "Ver minha sessão no Ecoponto" abre `leitor.html`; sem sessão ativa, `leitor.html` volta à coleta com aviso.

## Leitura de produtos (Ecoponto) e saldo (pessoa)
- [ ] Em `empresa.html` → "Leitor do Ecoponto": escolher o ponto; mostra "Aguardando" e, depois que a pessoa conecta, "Conectado: nome".
- [ ] Ler um código **válido da campanha** (câmera e digitado): resultado com `+N coins` da API.
- [ ] No celular da pessoa (`leitor.html` e `coleta.html`): saldo e histórico sobem em até 5 s, sem recarregar.
- [ ] Mesmo código de novo: erro de duplicidade com a mensagem da API; sem moedas.
- [ ] Código fora da campanha e dígito verificador inválido: mensagens da API.
- [ ] Sessão expirada: o Ecoponto não credita; a pessoa volta à coleta com o aviso.
- [ ] Lembrete: 5 dos 6 EANs do seed original são inválidos (ver `docs/BACKEND-ajustes-vindos-do-front.md`, item 3).

## Recompensas e resgate
- [ ] Lista de recompensas vem da API e o filtro por categoria funciona.
- [ ] Saldo menor que o custo: botão desabilitado. Saldo suficiente: resgata, saldo diminui, toast com o cupom, histórico mostra o resgate.
- [ ] "Cupom McDonald's" resgata normalmente.
- [ ] Duplo clique não resgata duas vezes.

## Perfil
- [ ] Nome, e-mail, saldo, nível, barra de progresso e impacto vêm da API; histórico e mini-gráfico mostram créditos reais.
- [ ] Editar nome/e-mail e trocar a foto (URL): salva, e o menu do avatar atualiza. E-mail repetido mostra erro.
- [ ] Excluir conta: confirma, anonimiza e volta ao login; o login antigo deixa de funcionar.
- [ ] Subir de nível dispara o confete uma vez (se a API enviar `nivel.subiu`).

## Painel da empresa
- [ ] Totais, gráfico de 6 meses, percentuais por material e tabela de ecopontos **batem com o banco** (confira uma soma à mão).
- [ ] "Última atividade" e status refletem a realidade (leia um produto e veja mudar).
- [ ] Empresa só vê os próprios ecopontos; pessoa comum tentando abrir `empresa.html` vai ao login.
- [ ] QR: gerar, baixar PNG, imprimir; o QR gerado é aceito na coleta.

## Exportar dados (empresa)
- [ ] Em `empresa.html`, seção "Exportar dados dos ecopontos": **Baixar resumo (CSV)** baixa `ecopontos-resumo-AAAA-MM-DD.csv` com os mesmos ecopontos da tabela.
- [ ] **Baixar histórico (CSV)** por ecoponto e por período (mês atual, 3 meses, 6 meses, tudo): a contagem de linhas bate com o banco e a ordem é da mais recente para a mais antiga.
- [ ] Os CSV abrem no Excel em português com acentos corretos (colunas separadas por `;`); o arquivo **não tem nenhum dado pessoal**.
- [ ] Período sem leituras: aviso "Nenhuma leitura encontrada" e nenhum arquivo. Histórico muito grande: aviso "as N leituras mais recentes de TOTAL".
- [ ] Outra empresa não consegue baixar os ecopontos desta (a API responde 403).

## Conexão e ambientes
- [ ] Com a API local no ar, o selo fica **verde** ("Local"). Derrubando a API local e recarregando, o front passa sozinho para o servidor (se configurado) ou mostra "Sem conexão".
- [ ] Derrubar a API **durante o uso** avisa "… indisponível. Usando …. Entre novamente." e leva ao login (quando há outro ambiente).
- [ ] `…/api/v1/saude` devolve `ok`; com o MySQL parado devolve **503** e o selo avisa.
- [ ] `?ambiente=servidor` / `?ambiente=local` fixam o ambiente; clicar no selo abre o menu de troca.
- [ ] No plano B (`servidor-demo`), o selo fica **amarelo** e o título da aba começa com `[DEMO]`.
- [ ] No painel da empresa, o QR mostra o código com **Copiar código**; colar na coleta conecta ao Ecoponto.

## Área master
- [ ] `consulta_usuarios.html`: lista com **CPF mascarado**; busca por nome filtra (no servidor); excluir pede confirmação e anonimiza.
- [ ] `logs.html`: lista com data formatada; filtros por nome e por CPF funcionam; falhas aparecem como "(falhou)".
- [ ] Pessoa comum abrindo essas telas vê o aviso de acesso negado (e a API responde 403).
- [ ] `modelo_bd.html`: o DER aparece desenhado (Mermaid) e rola na horizontal no celular.

## Tela de erro, acessibilidade e PDF (enunciado)
- [ ] `error_page.html?codigo=403` mostra "Acesso negado"; `?codigo=500`, "Algo inesperado aconteceu". Endereço inexistente (ex.: `/xyz`) cai na tela de erro 404.
- [ ] Forçar um erro 500 na API (ou desligá-la durante uma ação) abre a tela de erro com o botão Voltar; a checagem de saldo em segundo plano **não** redireciona.
- [ ] Logado, o menu do avatar aparece também na tela de erro, com "Sair da conta".
- [ ] **Barra de acessibilidade** no topo de todas as páginas: A+ e A− mudam o tamanho do texto (85% a 150%), A restaura; "Contraste" alterna fundo claro/escuro; a escolha de fonte permanece ao trocar de página.
- [ ] Com o aparelho em modo escuro, o site **abre claro**.
- [ ] Consulta de Usuários → "Baixar PDF": baixa `usuarios-ecotech.pdf` com todos os usuários da busca atual, CPF mascarado, em mais de uma página se a lista for grande.
- [ ] `modelo_bd.html`: aparece a **imagem** do DER; clicar abre o PNG em tamanho real.
- [ ] `sobre_nos.html`: o botão "Assinar a newsletter da Mongabay" abre a página de inscrição em outra aba; nenhuma janela `alert()` aparece em lugar nenhum.

## Páginas públicas e geral
- [ ] `sobre_nos.html` e `afilie_se.html`: contadores animam com os números da API.
- [ ] Tema claro/escuro persiste entre todas as páginas, inclusive após ir ao perfil.
- [ ] Sem internet: toast "Sem conexão com o servidor…" (não tela em branco).
- [ ] Grep final no código: `mockapi.io`, `viacep`, `openfoodfacts` e `fetch(` só em `js/api.js`.
