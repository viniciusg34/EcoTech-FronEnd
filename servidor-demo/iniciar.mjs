// Inicia o servidor de demonstração:   node iniciar.mjs   (ou: npm run demo)
//   --so-api    só a API simulada (porta 8000)
//   --so-front  só o front estático (porta 5500), para usar com o backend real
import { criarApi } from "./api-demo.mjs";
import { criarFront } from "./front-estatico.mjs";

const args = process.argv.slice(2);
const soApi = args.includes("--so-api");
const soFront = args.includes("--so-front");
const PORTA_API = Number(process.env.PORTA_API || 8000);
const PORTA_FRONT = Number(process.env.PORTA_FRONT || 5500);

function ouvir(servidor, porta, nome) {
  return new Promise((ok) => {
    servidor.once("error", (e) => {
      console.error(e.code === "EADDRINUSE" ? `\n✖ A porta ${porta} (${nome}) já está em uso. Feche o programa que a usa (por exemplo o backend real) ou mude com ${nome === "API" ? "PORTA_API" : "PORTA_FRONT"}.` : e);
      process.exit(1);
    });
    servidor.listen(porta, ok);
  });
}

console.log("\n  EcoTech — servidor de DEMONSTRAÇÃO\n  ───────────────────────────────────");
if (!soFront) {
  await ouvir(criarApi(), PORTA_API, "API");
  console.log(`  API simulada:  http://localhost:${PORTA_API}/api/v1   (dados em memória; reiniciar zera tudo)`);
}
if (!soApi) {
  await ouvir(criarFront(), PORTA_FRONT, "front");
  console.log(`  Site:          http://localhost:${PORTA_FRONT}/index.html`);
}
if (!soFront) {
  console.log(`
  Contas de teste
    Pessoa comum   login DEMOUS  (ou demo@ecotech.com)   senha Demo1234
                   2FA: nome da mãe "Ana Souza" · nascimento 14/03/1995 · CEP 20040020
    Master         login MASTER  (ou master@ecotech.com) senha Master123   (2FA: mãe "Maria Master" · 01/01/1980 · CEP 20040020)
    Empresa        empresa@ecotech.com                   senha Empresa123  (sem 2FA)
  Código de barras para o leitor do Ecoponto: 7891910000197 (Pilha AA) e outros em servidor-demo/LEIA-ME.md

  ⚠ Isto NÃO é o backend do projeto: é uma simulação para ensaio e plano B.
    Abra o site com ?status=1 para ver o selo amarelo "Demonstração · dados simulados".
`);
}
