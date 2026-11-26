# Servidor de demonstração (plano B)

Simula a API do EcoTech **no seu computador**, com dados de exemplo em memória. Serve para:
- ensaiar o site sem depender do backend, do banco ou da internet;
- ser o **plano B** da apresentação se a conexão ou o banco falharem.

> ⚠️ **Isto não é o backend do projeto.** O backend real é a API em PHP/Laravel com MySQL. Aqui tudo é simulado e some quando o programa é fechado. O site mostra um selo amarelo **"Demonstração · dados simulados"** e `[DEMO]` no título da aba enquanto estiver usando este servidor. Se for usá-lo na apresentação, diga isso à banca.

## Como usar
Precisa do **Node.js 18 ou mais novo** (nodejs.org). Não precisa instalar nada mais (sem `npm install`).

| Para quê | Comando (dentro da pasta `servidor-demo`) |
|---|---|
| API simulada **e** site | `node iniciar.mjs` (ou duplo clique em `iniciar-demo.bat` no Windows / `./iniciar-demo.sh` no Mac e Linux) |
| Só o site, com o backend real | `node iniciar.mjs --so-front` |
| Só a API simulada | `node iniciar.mjs --so-api` |
| Autoteste (77 verificações) | `node teste-api.mjs` |

Abra **http://localhost:5500/index.html**. A API fica em `http://localhost:8000/api/v1` (o mesmo endereço do ambiente "Local" do `js/config.js`, então o site a encontra sozinho). Se o backend real estiver rodando na porta 8000, feche um dos dois ou use `PORTA_API=8001`.

## Contas de teste
| Perfil | Login | Senha | 2FA (responda o que for perguntado) |
|---|---|---|---|
| Pessoa comum | `DEMOUS` ou demo@ecotech.com | `Demo1234` | mãe: **Ana Souza** · nascimento: **14/03/1995** · CEP: **20040020** |
| Master | `MASTER` ou master@ecotech.com | `Master123` | mãe: **Maria Master** · nascimento: **01/01/1980** · CEP: **20040020** |
| Empresa | empresa@ecotech.com | `Empresa123` | não tem 2FA |

Outras pessoas para a lista do master: `CARLOS` (Carlos123) e `JULIAN` (Juliana123).

## Códigos de barras para o leitor do Ecoponto
Um mesmo produto só credita **uma vez a cada 24 horas por pessoa**.

| Código | Produto | Moedas |
|---|---|---|
| 7896004004778 | Garrafa PET 500ml | 30 |
| 7891234567895 | Lata de Alumínio 350ml | 40 |
| 7896666000019 | Caixa de Papelão | 20 |
| 7899000001239 | Vidro de Conserva | 35 |
| 7891910000197 | Pilha Alcalina AA | 80 |
| 7896000000002 | Embalagem Tetra Pak | 25 |

## Diferenças em relação ao backend real
- Os dados (22 ecopontos de exemplo no Rio e na Costa Verde, 6 meses de coletas) são fictícios e **reiniciam** a cada vez que o programa abre.
- O check-in pode repetir depois de **2 minutos** (no real, 6 horas). Mude com `DEMO_CHECKIN_COOLDOWN_MIN=10`.
- "Entrar com Google" não funciona (responde que está indisponível). O CEP só conhece alguns endereços do Rio (ex.: 20040020, 22041001, 24020000, 23900000).
- Senha do master: `DEMO_MASTER_PASSWORD=outra node iniciar.mjs`.
