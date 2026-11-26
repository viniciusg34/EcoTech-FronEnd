# EcoTech — Ajustes para o Backend (vindos do front, Etapas 1 a 3)

Complementa o documento "Backend (banco de dados + API Laravel)". Reúne o que o front **já espera** da API e o que **não estava no PDF**. A Etapa 4 (empresa e master) vai acrescentar uma seção no fim.

Os contratos abaixo estão marcados no código do front (`js/api.js`, comentários "CONTRATO"). Quando o `openapi.yaml` existir, o front se ajusta a ele em um único arquivo.

---

## 1. Fluxo do Ecoponto (decisão do produto)

1. **A pessoa lê só o QR da placa** do Ecoponto → `POST /ecopontos/conectar` cria a `sessao_ecoponto`; em seguida `POST /checkins`.
2. **O Ecoponto lê os produtos** (código de barras) → `POST /ecopontos/{id}/leituras {sessao_id, code}`, autenticado como a **empresa dona do ponto**. As moedas vão para a pessoa da sessão.
3. **O celular da pessoa só acompanha**: `GET /me/coins` e `GET /me/movimentos`, a cada 5 s enquanto a sessão está ativa.

Consequência: **`POST /scans` deixa de ser usado pelo front.** Recomendo removê-lo ou restringi-lo (admin/teste). Deixar a pessoa creditar moedas escaneando um código na tela de outro aparelho permite ganhar sem reciclar.

### Endpoint novo necessário (não está no PDF)

A tela do Ecoponto precisa saber **quem está conectado**:

```
GET /ecopontos/{id}/sessao-ativa        (empresa dona do ponto)
200 { "sessao_id": 55, "pessoa": { "nome": "Ana M.", "avatar": null }, "expira_em": "2026-11-16T15:10:00Z" }
404 { "erro": "sem_sessao", "message": "Nenhuma pessoa conectada." }
```
- Devolve a sessão ativa mais recente do ponto. Nome abreviado, sem CPF nem e-mail (LGPD).
- Opcional: `DELETE /ecopontos/{id}/sessao-ativa` para a empresa encerrar a sessão.

---

## 2. Endpoints novos ou alterados

### 2.1 `GET /estatisticas` (público, novo)
Números do hero da página inicial e das páginas "Sobre nós" e "Afilie-se".
```json
{ "toneladas": 12.4, "membros": 1530, "empresas": 10, "ecopontos": 22 }
```
- `toneladas` = soma de `coleta.total_kg` / 1000; `membros` = pessoas ativas; `empresas` = empresas com status `ativa`; `ecopontos` = pontos com status `ativo`.
- Sem este endpoint as três páginas mantêm o texto que já está no HTML (o front não inventa número). Antes existiam valores de reserva falsos (22 ecopontos, 10 empresas, 21.000 kg) e foram removidos.

### 2.2 `GET /me` (estendido)
Hoje o front calcula nível e impacto no navegador. Isso passa para a API. Regras copiadas do código antigo:

**Nível** (por `saldo_coins`, inteiro): `Iniciante Verde` 0 · `Reciclador Prata` 500 · `Guardião Verde` 1500 · `Mestre Eco` 3000.
- `progresso` (0 a 100) = `(coins − min_atual) / (min_proximo − min_atual) × 100`; no último nível, 100.
- `meta` (texto pronto): `"próximo: Guardião Verde (1500 pts)"` ou `"nível máximo alcançado 🏆"`.

**Impacto** (p = coins, mínimo 0): árvores = `floor(p/40)`; água = `round(p×1,5)` + "L"; energia = `round(p×0,25)` + "kWh"; CO₂ = `round(p×0,3)` + "kg". Números com separador pt-BR ("1.875L").

```json
{
  "id": 1, "nome": "Ana Maria da Silva", "email": "ana@x.com", "avatar": null,
  "coins": 1250, "coins_formatado": "1.250",
  "nivel":   { "nome": "Reciclador Prata", "meta": "próximo: Guardião Verde (1500 pts)", "progresso": 50, "subiu": false },
  "impacto": { "arvores": "31", "agua": "1.875L", "energia": "312kWh", "co2": "375kg" }
}
```
- `nivel.subiu` = `true` na **primeira** leitura de `/me` depois que a pessoa mudou de nível (dispara o confete). Sem esse campo, o confete não aparece. Pede coluna ou controle de "último nível visto".
- Pode vir direto ou embrulhado em `{ "data": {...} }`; o front aceita os dois.
- `PUT /me` recebe `{ nome, email, avatar_url }` e devolve o mesmo objeto. `DELETE /me` anonimiza (204).

### 2.3 `GET /me/coins`
```json
{ "balance": 1250, "balance_formatado": "1.250" }
```
Será chamado a cada 5 s por pessoa com sessão ativa: **limite generoso** (ex.: 60/min). 429 nessa rota é ignorado em silêncio, mas atrasa o saldo.

### 2.4 `GET /me/movimentos` (o extrato)
Linha do tempo do ledger (`movimento_coins`), da mais recente para a mais antiga. Usado no perfil, na coleta e na sessão do Ecoponto.
Query: `pagina`, `por_pagina` (o front pede 20).
```json
{
  "data": [
    { "id": 981, "tipo": "leitura", "titulo": "Garrafa PET", "subtitulo": "ECO-01", "icone": "🧴",
      "valor": 30, "valor_formatado": "+30", "data": "2026-11-10T14:32:00Z", "data_formatada": "10/11/2026 às 14:32" },
    { "id": 975, "tipo": "resgate", "titulo": "Café Grátis", "icone": "☕",
      "valor": -80, "valor_formatado": "-80", "data_formatada": "09/11/2026 às 10:00" }
  ],
  "meta": { "total": 2, "pagina": 1, "por_pagina": 20 }
}
```
- `valor` numérico com sinal (o front separa créditos de resgates por ele); `valor_formatado` já com sinal.
- `titulo` e `icone` por tipo: leitura → nome do produto; check-in → "Check-in em {ecoponto}"; resgate → nome da recompensa.

### 2.5 `POST /ecopontos/conectar` e `POST /checkins`
```
POST /ecopontos/conectar   { "qr": "ECO-01|emp=1|ep=3|sig=..." }
200 { "sessao_id": 55, "ecoponto": { "id": 3, "codigo": "ECO-01", "nome": "Ecoponto Centro" },
      "expira_em": "2026-11-16T15:10:00Z", "message": "Conectado ao Ecoponto Centro." }
422 { "erro": "qr_invalido", "message": "QR inválido." }        (assinatura errada ou ponto inativo)

POST /checkins   { "sessao_id": 55 }
200 { "coinsAwarded": 50, "balance": 1300, "message": "Check-in feito: +50 coins e 0,5 kg." }
```
- Se a pessoa já tem sessão ativa no mesmo ponto, `conectar` devolve a existente (idempotente).
- Check-in em cooldown: `429` ou `409` com `message` pronta ("Próximo check-in em 3 h"). O front só mostra a `message`; a pessoa continua conectada.
- `expira_em` em ISO 8601 (o front compara com o relógio do aparelho para decidir se a sessão ainda vale).
- O corpo de `/checkins` (`sessao_id`) é suposição; ajustar se o contrato for outro.

### 2.6 `GET /ecopontos`, `GET /categorias`, `GET /recompensas` (públicas)
```json
// /ecopontos → itens
{ "id": 3, "codigo": "ECO-01", "nome": "Ecoponto Centro", "descricao": "Coleta de metais e sucata",
  "endereco": "Rua da Assembleia, 10", "cidade": "Rio de Janeiro", "estado": "RJ",
  "lat": -22.9068, "lng": -43.1729, "status": "ativo", "status_rotulo": "Ativo",
  "categorias": [ { "chave": "metal", "rotulo": "Metal", "cor_hex": "#f9a825" } ],
  "kg_coletado_formatado": "12,5 kg" }
// /categorias → { "chave": "metal", "rotulo": "Metal", "cor_hex": "#f9a825" }
// /recompensas?cat=food → { "id": 7, "categoria": "food", "icone": "🍔", "nome": "Cupom McDonald's", "descricao": "20% OFF em combos", "custo_coins": 200 }
```
- **Paginação:** o front pede `?pagina=N&por_pagina=100` e junta as páginas até `meta.total`. **`por_pagina=100` precisa ser aceito**; senão o mapa perde ecopontos.
- Não precisa de token. `lat`/`lng` podem vir string; o front converte.
- `/recompensas?cat=` aceita `todos` ou ausente = tudo.

### 2.7 `POST /resgates`
```
{ "recompensa_id": 7 }   + header Idempotency-Key
201 { "message": "Resgate realizado.", "codigo_cupom": "CUP-ABC123" }
422/409 { "erro": "saldo_insuficiente", "message": "Saldo insuficiente." }
```
`codigo_cupom` aparece no toast; é a única forma de a pessoa ver o cupom hoje.

### 2.8 Autenticação (Etapas 1 e 2)
| Rota | Envio | Resposta esperada |
|---|---|---|
| `POST /auth/login` | `{ email` **ou** `login, senha, lembrar }` (`email` se tiver "@") | pessoa: `{ status:"2fa", desafio_id, pergunta, pergunta_tipo }`; empresa: `{ token, usuario }` |
| `POST /auth/2fa` | `{ desafio_id, resposta, lembrar }` | `{ token, usuario:{ id, nome, email, tipo, perfil, avatar, coins } }` |
| `POST /auth/google` | `{ credential }` | sessão como acima, ou `{ status:"cadastro_pendente", nome, email, message }` |
| `POST /auth/esqueci-senha` | `{ email }` | **sempre** `{ desafio_id, pergunta, pergunta_tipo }` |
| `POST /auth/esqueci-senha/verificar` | `{ desafio_id, resposta }` | `{ token }` (reset, 10 min) |
| `POST /auth/redefinir-senha` | `{ token, nova_senha }` | `{ message }` |
| `PUT /me/senha` | `{ senha_atual, nova_senha }` | `{ message }` |

Pontos que o PDF deixa em aberto:
- **`pergunta_tipo`** (`nome_mae` \| `nascimento` \| `cep`): o front usa para máscara e teclado. Sem ele, deduz pelo texto.
- **Erro de 2FA e de recuperação:** `422 { erro:"resposta_invalida", message, tentativas_restantes }`. Desafio bloqueado ou expirado: `423` (ou `410`) com `tentativas_restantes: 0`. O front trata 410, 423, `tentativas_restantes: 0` e `erro`/`message` contendo "bloquead" ou "expirad".
- **Recuperação sem revelar a conta:** para e-mail inexistente, devolver um desafio **falso mas estável** (mesma pergunta para o mesmo e-mail), e falhar a verificação como se fosse real. Se `esqueci-senha` responder só uma mensagem sem `desafio_id`, a tela não avança.
- **`lembrar`** (token de 30 dias) é nome proposto pelo front. Aceitar no login e no 2FA.
- **Pergunta no erro:** o front **não** sorteia nova pergunta a cada erro (como fazia antes); a pergunta do desafio é fixa.

### 2.9 Cadastro
`POST /pessoas` (público), campos em snake_case, só dígitos em CPF, CEP e telefones:
```json
{ "nome": "...", "email": "...", "cpf": "52998224725", "login": "abcdef", "senha": "...",
  "nome_mae": "...", "nascimento": "1990-05-12", "sexo": "feminino",
  "telefone_celular": "21999991234", "telefone_fixo": "2133331234",
  "cep": "20040020", "logradouro": "...", "numero": "10", "bairro": "...", "cidade": "...", "uf": "RJ",
  "termos_aceitos": true }
```
- `sexo`: `feminino`, `masculino`, `outro`, `nao_informar`.
- **Telefones com DDD** (11 e 10 dígitos). O PDF diz "celular de 9 dígitos / fixo de 8": confirmar se o DDD vai junto. Se não for, o front passa a enviar separado.
- Resposta: `201`, opcionalmente `{ token, usuario }`. Com token, o front já entra logado; sem, vai para o login.
- Erros: `409 { erro, message, campos:{ email:["..."] } }` para e-mail, CPF ou login repetidos; `422` com `campos`. O front marca o campo e leva à aba certa.
- `POST /empresas`: `{ cnpj (dígitos), nome_empresa, razao_social, email, senha, endereco }`.
- `GET /cep/{8 dígitos}` → `{ logradouro, bairro, cidade, uf }` ou `404 { erro, message }`.

---

## 3. Seed: códigos de barras inválidos

Cinco dos seis produtos do seed têm **dígito verificador errado** e seriam rejeitados pela própria validação EAN-13. Só a Pilha AA passa. Sugestão (mantém os 12 primeiros dígitos e recalcula o último):

| Produto | PDF | Corrigido |
|---|---|---|
| Garrafa PET 500ml | 7896004004777 | **7896004004778** |
| Lata de Alumínio 350ml | 7891234567890 | **7891234567895** |
| Caixa de Papelão | 7896666000014 | **7896666000019** |
| Vidro de Conserva | 7899000001234 | **7899000001239** |
| Pilha Alcalina AA | 7891910000197 | já válido |
| Embalagem Tetra Pak | 7896000000001 | **7896000000002** |

Para a apresentação, o Ecoponto precisa ler códigos que existam de fato nas embalagens, ou imprimir etiquetas com esses números.

---

## 4. Infra e formato de resposta

- **CORS:** `allowed_origins` = `CORS_ORIGINS` (domínio da Vercel **e** `http://localhost:*` / Live Server). `allowed_headers`: `Authorization`, `Content-Type`, `Accept`, **`Idempotency-Key`**. Sem cookies (Bearer). Responder `OPTIONS` com 204.
- **Erros sempre em JSON**, inclusive 401, 403, 404, 405, 422, 429 e 500: `{ "erro": "codigo_curto", "message": "texto pronto para toast", "campos": { "campo": ["msg"] } }`. O front mostra só `message`. Em 429, `message` amigável.
- **Sucesso:** objeto direto ou `{ data }`; listas `{ data, meta:{ total, pagina, por_pagina }, links }`. Nomes de campo estáveis.
- **HTTPS** obrigatório em produção (a Vercel bloqueia HTTP). `BASE_URL` do front inclui `/api/v1`.
- **Texto pronto:** datas `data_formatada` ("10/11/2026 às 14:32"), `*_formatado` com separador pt-BR, rótulos e cores de status e categoria. O front não formata nada.

---

## 5. Perguntas em aberto para o backend

1. `POST /checkins`: corpo (`sessao_id`?) e resposta; código HTTP do cooldown.
2. Fluxo da tela do Ecoponto: `GET /ecopontos/{id}/sessao-ativa` (item 1) ou outro desenho?
3. Telefone com ou sem DDD.
4. `/auth/esqueci-senha`: confirmar o desafio falso estável.
5. `nivel.subiu`: como controlar "primeira leitura após subir".
6. Preferência de notificações do perfil: hoje fica no navegador. Se quiser sincronizar: `PUT /me/preferencias`.
7. `POST /scans`: remover ou manter só para admin?

## 6. Aceite (o que o front testa)

- Login, 2FA com 3 erros bloqueando, recuperação em 3 etapas, troca de senha.
- Cadastro de pessoa com `409` por e-mail repetido e `422` com `campos`.
- Mapa com 22 ecopontos paginados e filtro por categoria.
- QR → sessão → check-in; o Ecoponto lê um produto; o saldo e o histórico da pessoa mudam em até 5 s.
- Resgate com saldo suficiente e insuficiente.
- Perfil com nível, barra de progresso e impacto vindos de `/me`.

---

## 7. Etapa 4 — Empresa, tela do Ecoponto e área master

### 7.1 `GET /empresas/me/dashboard` (empresa)
Substitui o `js/empresa-data.js`, que inventava a última atividade e a série mensal. Tudo vem pronto:
```json
{
  "empresa": { "nome": "Eco Parceira" },
  "totais": { "ecopontos": 2, "kg_formatado": "1.234", "validacoes_formatado": "740",
              "ativos": 1, "variacao_kg_texto": "↑ 12% vs mês anterior" },
  "serie": { "labels": ["Jun","Jul","Ago","Set","Out","Nov"], "valores": [100,150,200,180,220,300],
             "valores_formatados": ["100","150","200","180","220","300"], "total_formatado": "Total: 1.150 kg" },
  "categorias": [ { "chave": "metal", "rotulo": "Metal", "cor_hex": "#f9a825", "percentual": 60 } ],
  "ecopontos": [ { "id": 3, "codigo": "ECO-01", "nome": "Centro", "endereco": "Rua A, Rio",
                   "status": "ativo", "status_rotulo": "Ativo",
                   "categorias": [ { "chave": "metal", "rotulo": "Metal", "cor_hex": "#f9a825" } ],
                   "kg_mes_formatado": "300 kg", "ultima_atividade": "Hoje, 08h30" } ]
}
```
- `serie`: últimos 6 meses (`vw_empresa_kg_mensal`), rótulos curtos pt-BR, do mais antigo ao mais recente. `valores_formatados` é opcional (sem ele o front mostra o número).
- `categorias`: `vw_empresa_categoria`; `percentual` inteiro, somando 100.
- `kg_mes_formatado`: kg do mês corrente por ecoponto. `validacoes_formatado`: total de leituras creditadas.
- `ultima_atividade`: texto pronto ("Hoje, 08h30", "Ontem, 16h40", "Há 2 dias"), vindo de `vw_ecoponto_resumo`.
- `status` ∈ `ativo | manutencao | inativo` (o front usa a chave para a cor da etiqueta e `status_rotulo` para o texto).
- Só os ecopontos da empresa autenticada (Policy). Pessoa comum recebe `403`.

### 7.2 `GET /ecopontos/{id}/qr.svg` (empresa dona do ponto)
- Resposta `image/svg+xml` com o QR do payload assinado (`ECO-{codigo}|emp=..|ep=..|sig=..`).
- Como `<img>` não envia `Authorization`, o front busca com o Bearer e exibe como data URL; o download em PNG é feito no navegador a partir desse SVG. Se o endpoint for público por ser só um QR assinado, melhor ainda: me avise e o front passa a usar o endereço direto.
- O modo dinâmico (token que expira em 60 s) não foi implementado no front; o QR é o estático assinado.

### 7.3 Tela do Ecoponto (dentro do `empresa.html`)
Seção "📟 Leitor do Ecoponto": a empresa escolhe um ponto **ativo**, vê quem está conectado e lê os códigos de barras (câmera ou digitação).
```
GET  /ecopontos/{id}/sessao-ativa          (consulta a cada 4 s)
200 { "sessao_id": 55, "pessoa": { "nome": "Ana M." }, "expira_em": "2026-11-16T15:10:00Z" }
404 { "erro": "sem_sessao", "message": "Nenhuma pessoa conectada." }

POST /ecopontos/{id}/leituras   { "sessao_id": 55, "code": "7891910000197" }   + Idempotency-Key
200 { "coinsAwarded": 30, "message": "Garrafa PET validada: +30 coins.", "produto": { "nome": "Garrafa PET 500ml" } }
404 produto fora da campanha | 409 já lido pela pessoa na janela | 422 EAN inválido
403 sessão expirada/de outro ponto | 429 excesso de leituras
```
- O front **nunca envia moedas**; mostra `message` (e `coinsAwarded` quando maior que 0). Todos os erros precisam de `message` pronta em português.
- Autenticado como a empresa dona do ponto (token com ability `empresa`); ponto de outra empresa = `403`.
- A leitura precisa creditar a **pessoa da sessão** (ledger `leitura`), e é isso que o celular da pessoa vê em até 5 s.
- O front só aceita ler quando há pessoa conectada; mesmo assim a API deve validar a sessão.

### 7.4 Master
```
GET    /admin/pessoas?busca=Ana&por_pagina=100
200 { "data": [ { "id": 1, "nome": "Ana Maria", "email": "a@x.com", "cpf_mascarado": "***.982.247-**" } ], "meta": { "total": 1 } }
DELETE /admin/pessoas/{id}                  → 204 (anonimiza; preserva ledger e coletas)

GET    /admin/logs-autenticacao?tipo=cpf&termo=982&por_pagina=100
200 { "data": [ { "data_formatada": "10/11/2026 às 14:32", "nome": "Ana Maria",
                  "cpf_mascarado": "***.982.247-**", "metodo_2fa": "Qual o nome da sua mãe?", "sucesso": true } ],
      "meta": { "total": 1 } }
```
- A busca (`busca`, e `tipo=nome|cpf` + `termo`) é **no servidor**; o front espera 300 ms depois de digitar. `tipo=cpf` compara só dígitos.
- **Caminho do log:** o PDF escreve `/admin/logsautenticacao`; o front chama **`/admin/logs-autenticacao`**. Confirme o caminho (está numa constante em `js/api.js`, objeto `Admin`).
- A lista de pessoas **não inclui contas master**. CPF sempre mascarado; nada de nome da mãe, nascimento ou CEP.
- O log inclui as **falhas** (`sucesso: false`); o front acrescenta "(falhou)" na etiqueta. Tentativa com e-mail inexistente não tem pessoa: gravar `nome` vazio ou ignorar (decisão do backend).
- Perfil não master: `403` com `message`. O front esconde as telas pelo `perfil` da sessão, mas só a API autoriza de verdade.
- O front **não** tem telas para `CRUD /admin/recompensas` e `/admin/produtos`; não foram pedidas, então não há contrato.

### 7.5 Perguntas em aberto da Etapa 4
1. Caminho do log: `logs-autenticacao` ou `logsautenticacao`?
2. `qr.svg` exige token? (Se for público, o front simplifica.)
3. Login de empresa: `usuario.nome` deve trazer o `nome_empresa`; `tipo: "empresa"`; `perfil: "comum"`.
4. Tentativas de login com e-mail inexistente entram no log?
5. `por_pagina=100` em `/admin/*`: a lista mostra "mostrando N" quando o total passa de 100; paginação completa ficou fora.

### 7.5b Exigências do enunciado que recaem na API
- **Log (`/admin/logs-autenticacao`):** ordenar por `data_hora` **do mais recente para o mais antigo** e listar só entradas de **usuários comuns** (o enunciado pede "entradas do usuário comum", em ordem mais recente).
- **Lista de usuários (`/admin/pessoas`):** só usuários **comuns**, em ordem alfabética por nome; a busca é por **parte do nome** (substring, `LIKE %termo%`). A página de PDF pede todas as páginas com `pagina` e `por_pagina=100` e usa `meta.total` para saber quando parar.
- **Troca de senha (`PUT /me/senha`):** só o usuário **comum**, e só a própria senha. Master recebe `403` com `message`.
- **Cadastro (`POST /pessoas`):** nunca aceitar `perfil` no corpo; toda conta nova é `comum`. O **master é criado por script SQL** (o enunciado exige); entregar o `INSERT` com o hash já calculado em `03_seed.sql`, em vez de gerá-lo por seeder com senha no `.env`.
- **Erros:** o front abre a **tela de erro** para `403` e `5xx` mostrando o `message` da API (até 300 caracteres, como texto). Por isso todo erro precisa de `message` pronta em português, sem detalhes técnicos.

### 7.5c Exportação de dados da empresa (CSV) — **1 endpoint novo**
Na área da empresa há uma seção "Exportar dados dos ecopontos" com dois arquivos CSV:
- **Resumo dos ecopontos:** sai do `GET /empresas/me/dashboard` que já existe (código, nome, endereço, `status_rotulo`, materiais, `kg_mes_formatado`, `ultima_atividade`). **Não exige mudança no backend.**
- **Histórico de leituras:** precisa de um endpoint novo.

```
GET /empresas/me/leituras?periodo=mes|3m|6m|tudo&ecoponto_id=3&pagina=1&por_pagina=100
200 { "data": [
        { "data_formatada": "10/11/2026 às 14:32", "ecoponto_codigo": "ECO-01", "ecoponto_nome": "Centro",
          "produto": "Garrafa PET 500ml", "categoria": "Plástico", "kg_formatado": "0,03 kg",
          "coins": 30, "resultado_rotulo": "Creditado" } ],
      "meta": { "total": 130, "pagina": 1, "por_pagina": 100 } }
```
- **Quem pode:** a empresa autenticada, só nos **próprios** ecopontos (Policy). `ecoponto_id` de outra empresa: `403`. Pessoa comum: `403`.
- **`periodo`:** o servidor calcula os limites (o front não faz conta de datas): `mes` = do dia 1º do mês corrente até agora (padrão se vier vazio); `3m` e `6m` = os últimos 3 e 6 meses; `tudo` = sem limite.
- **Ordem:** `lido_em` do mais recente para o mais antigo. Inclui as leituras **não creditadas** (`resultado_rotulo`: "Creditado", "Duplicado", "Fora da campanha", "Código inválido"), com `coins` 0 e `kg_formatado` "—".
- **LGPD:** **nenhum dado pessoal** na resposta: sem `pessoa_id`, nome, CPF, e-mail nem sessão. O arquivo é da empresa, não de quem reciclou.
- **Paginação:** aceitar `por_pagina=100`. O front junta até 200 páginas (20.000 linhas) e, se `meta.total` for maior, avisa "baixadas as N leituras mais recentes de TOTAL".
- **De onde vêm os dados:** `leitura_codigo` + `ecoponto` + `produto_catalogo` (nome, categoria) e `coleta` (kg). Para existir `kg` por leitura o banco precisa de **`produto_catalogo.peso_kg`** e **`leitura_codigo.coleta_id`**, que já estão no `MODELO-LOGICO.md`. Índice: `leitura_codigo (ecoponto_id, lido_em)`.

### 7.6 Aceite da Etapa 4
- Empresa vê painel com 6 meses reais, percentuais somando 100 e última atividade real.
- QR do ponto gerado pelo servidor; placa imprime o mesmo QR.
- Ecoponto vê a pessoa conectada, lê um produto e a pessoa recebe as moedas; leitura duplicada devolve 409 com `message`.
- Master pesquisa por nome, exclui (anonimiza) e consulta o log filtrando por nome e por CPF; pessoa comum recebe 403.
- Empresa baixa o histórico de leituras (CSV) por ecoponto e período, sem dado pessoal; ecoponto de outra empresa devolve 403.

---

## 8. Conexão e apresentação (o que a API precisa para o front alternar entre ambientes)

O front tem vários ambientes (local e servidor) e escolhe o que responder (ver `docs/APRESENTACAO-LOCAL.md`). Isso exige da API:

### 8.1 `GET /api/v1/saude` (público, **novo**)
```
200 { "status": "ok", "banco": "ok", "modo": "real", "versao": "1.0.0" }
503 { "status": "erro", "banco": "erro", "modo": "real", "message": "Banco de dados indisponível." }
```
- Sem token, **fora** de qualquer limite de requisições e de qualquer middleware de autenticação; responde em menos de 1 segundo.
- Deve **testar o banco de verdade** (por exemplo `DB::select('select 1')` dentro de `try/catch`). Se o MySQL cair, devolver `503`: é assim que o front percebe que o ambiente está ruim e troca para o outro.
- O front trata como "fora do ar": falha de rede, tempo esgotado (2,5 s) ou HTTP `5xx`. Qualquer outra resposta conta como "no ar" (um backend ainda sem `/saude` devolveria 404 e continuaria funcionando, só sem o teste do banco).
- `modo` deve ser sempre `"real"`. O valor `"demo"` é reservado ao servidor de demonstração (`servidor-demo/`), que faz o front mostrar o selo amarelo "Demonstração · dados simulados".

### 8.2 CORS
- `CORS_ORIGINS` com **cada origem exata** do site: `http://localhost:5500`, `http://127.0.0.1:5500` (são origens diferentes) e o domínio da Vercel em HTTPS.
- `allowed_headers`: `Authorization`, `Content-Type`, `Accept`, `Idempotency-Key`. Responder `OPTIONS` com 204.
- Sem cookies (Bearer). O front não envia `credentials`.

### 8.3 Ambientes e HTTPS
- No site publicado (Vercel) a API precisa ser **HTTPS**; o front ignora endereços de `localhost` quando o site não está em `localhost`.
- Cada ambiente tem o **seu banco e as suas sessões**: ao trocar de ambiente o front limpa a sessão e pede novo login.

### 8.4 Texto do QR (opcional, já listado)
`GET /ecopontos/{id}/qr` devolve `{ "payload": "ECO-01|emp=1|ep=3|sig=..." }`. O painel da empresa mostra esse texto com um botão **Copiar código**, para a pessoa colar na tela de coleta se a câmera falhar na apresentação.
