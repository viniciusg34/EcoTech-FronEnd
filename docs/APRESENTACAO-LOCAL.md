# EcoTech — Guia para apresentar sem surpresas

Três formas de rodar. Escolha a principal e deixe a segunda pronta como reserva.

| | O que é | Quando usar |
|---|---|---|
| **A. Tudo local (backend real)** | Site + API Laravel + MySQL no seu computador | **Principal:** não depende de internet |
| **B. Servidor** | Site na Vercel + API hospedada (HTTPS) | Se a sala tiver boa internet e quiser mostrar online |
| **C. Demonstração (plano B)** | Site + API **simulada** no computador | Só se A e B falharem; **avise a banca** |

O front já sabe alternar: em `js/config.js` ficam os ambientes `local` e `servidor` e a ordem em que são tentados. Ele pergunta `GET /saude` a cada um e usa o primeiro que responder; se o escolhido cair no meio da apresentação, passa para o outro e pede novo login. Abrindo o site com **`?status=1`**, um **selo no canto inferior esquerdo** mostra onde ele está conectado (o usuário comum não vê o selo) (verde = real, amarelo = demonstração, vermelho = sem conexão) e, clicando, dá para trocar à mão.

## A. Tudo no seu computador (backend real)

**1. Banco (MySQL).** Inicie o MySQL (painel do XAMPP/Laragon, ou o serviço do MySQL 8). Crie o banco uma vez (`CREATE DATABASE ecotech CHARACTER SET utf8mb4;`).

**2. API Laravel** (na pasta do projeto do backend):
```
composer install
cp .env.example .env        # ajuste DB_DATABASE, DB_USERNAME, DB_PASSWORD
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```
No `.env` da API, **`CORS_ORIGINS` precisa listar exatamente o endereço do site**, com `localhost` e `127.0.0.1` separados:
```
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,https://SEU-SITE.vercel.app
```

**3. Site.** Duas opções: o Live Server do VS Code (porta 5500) ou, com Node instalado, dentro de `servidor-demo`: `node iniciar.mjs --so-front` e abra `http://localhost:5500/index.html`.

**4. Conferir.** `http://localhost:8000/api/v1/saude` deve responder `{"status":"ok","banco":"ok",...}`. Como o Railway vem primeiro na ordem, abra o site com `?ambiente=porta8000` para usar a API local: o selo deve ficar **verde** com o nome "Local (porta 8000)".

## B. Servidor (online)

1. A API oficial está no Railway: `https://ecotech-backend-production-5d655abd.up.railway.app/api/v1`, já configurada em `js/config.js` no ambiente `servidor`. Confira abrindo `…/api/v1/saude` no navegador.
2. Na API, `CORS_ORIGINS` com o domínio do site (Vercel) e `GET /saude` funcionando.
3. Publique o site na Vercel (projeto estático, sem build; o `.vercelignore` já deixa de fora `servidor-demo` e `docs`).
4. `js/config.js` usa `ORDEM: ["servidor", "porta8000", "local"]`: o site usa o Railway sempre que ele responder e só cai para a API local (ou o servidor-demo) se ele estiver fora do ar. Num site publicado o front **ignora** os endereços de `localhost`.

Para fixar um ambiente sem mexer no código: abra o site com `?ambiente=local` ou `?ambiente=servidor`; `?ambiente=auto` volta ao automático.

## C. Plano B: servidor de demonstração

Veja `servidor-demo/LEIA-ME.md`. Resumo: `node servidor-demo/iniciar.mjs` e abrir `http://localhost:5500`. O selo fica **amarelo** ("Demonstração · dados simulados"). Use só se o backend real não subir, e diga que é uma simulação.

## Roteiro de 5 minutos
1. **Master** (`MASTER`): Consulta de usuários (busca por parte do nome, **Baixar PDF**, excluir com confirmação) → Log de autenticação (filtro por nome e CPF) → Modelo do BD (imagem).
2. **Pessoa** (`DEMOUS`): login com **2FA** (e um erro de propósito: 3 erros voltam ao login) → perfil (nível, impacto) → mapa de ecopontos → recompensas e resgate.
3. **Empresa** (`empresa@ecotech.com`): painel (6 meses, materiais) → gerar o **QR** de um ecoponto → **Exportar dados** (CSV).
4. **Fluxo ao vivo** (duas telas): a pessoa lê o QR na coleta (ou cola o código do botão "Copiar código") → na tela da empresa, **Leitor do Ecoponto** mostra "Conectado: …" → ler um código de barras → o saldo da pessoa sobe sozinho.
5. Mostre a **acessibilidade**: clique no botão de tema (☀️/🌙) no topo; abre o painel com contraste (claro/escuro) e tamanho da fonte (A−, A, A+).

## Antes da apresentação (faça na véspera e 30 minutos antes)
- [ ] Notebook carregado, com o carregador; **Node.js** instalado se for usar o plano B.
- [ ] MySQL iniciado, API no ar e `…/api/v1/saude` respondendo `ok` (selo verde).
- [ ] `php artisan migrate:fresh --seed` feito, para começar com dados limpos e o master criado.
- [ ] Teste completo uma vez: cadastro → login com 2FA → coleta (QR) → leitura → resgate → painel da empresa → exportar CSV → PDF.
- [ ] `CARTO_KEY` preenchida (senão o mapa mostra "API KEY REQUIRED") e a chave liberada para o endereço usado (`localhost`).
- [ ] Use sempre o **mesmo endereço** no navegador e no `CORS_ORIGINS` (`localhost` ≠ `127.0.0.1`).
- [ ] Câmera: só funciona em HTTPS ou `localhost`. Tenha o código colado como reserva (botão "Copiar código").
- [ ] Plano B testado: `node servidor-demo/iniciar.mjs` abre e o selo fica amarelo.
- [ ] Outra opção: grave um vídeo curto do fluxo funcionando, para o pior caso.
- [ ] Feche programas que usam as portas 8000 e 5500 (a demonstração e a API real usam a 8000).

## Se algo falhar
| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Selo vermelho "Sem conexão · Local" | API parada, porta errada ou MySQL desligado | Suba a API e o MySQL; confira `…/saude`. Ou clique no selo e use outro ambiente |
| Selo verde, mas telas dão "erro inesperado" | A API respondeu, mas o banco não (500) | Reinicie o MySQL; `…/saude` deve voltar a `ok` |
| Console com "blocked by CORS" | `CORS_ORIGINS` sem o endereço exato do site | Inclua `http://localhost:5500` e `http://127.0.0.1:5500`, reinicie a API |
| Site na Vercel não conecta | `BASE_URL` sem HTTPS, ou API fora do ar | Confira o endereço `servidor` e o `/saude` |
| Mapa com "API KEY REQUIRED" | `CARTO_KEY` vazia ou da outra origem | Peça a chave em carto.com/basemaps/apikey |
| "Porta 8000 em uso" no plano B | O backend real já ocupa a porta | Feche um dos dois ou `PORTA_API=8001` (e ajuste `config.js`) |
| "Entrar com Google" falha em `localhost` | A origem não está no OAuth | Cadastre `http://localhost:5500` no Google Cloud; ou entre com e-mail |
| Câmera não abre | Sem HTTPS/localhost ou sem permissão | Use o campo manual e o código copiado |
