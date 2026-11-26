// Gera o DER como imagem (SVG e PNG) a partir de um arquivo Mermaid erDiagram.
// Uso:  node gerar-der.mjs ../der.mmd ../../assets/modelo-bd
//   (cria modelo-bd.svg e modelo-bd.png)
// Dependências (só para gerar a imagem; o site não precisa delas):
//   npm i @hpcc-js/wasm @resvg/resvg-js
import fs from "node:fs";
import { Graphviz } from "@hpcc-js/wasm/graphviz";
import { Resvg } from "@resvg/resvg-js";

const [, , entrada, saidaBase] = process.argv;
if (!entrada || !saidaBase) {
  console.error("Uso: node gerar-der.mjs <entrada.mmd> <saida-sem-extensao>");
  process.exit(1);
}

const linhas = fs.readFileSync(entrada, "utf8").split("\n");
const entidades = new Map(); // nome -> [{tipo, nome, chaves, nota}]
const relacoes = [];
let atual = null;

const CARD = { "||": "1", "|o": "0..1", "o|": "0..1", "o{": "0..N", "|{": "1..N", "}o": "0..N", "}|": "1..N" };

for (const bruta of linhas) {
  const l = bruta.trim();
  if (!l || l === "erDiagram") continue;
  let m;
  if ((m = l.match(/^(\w+)\s*\{$/))) {
    atual = m[1];
    entidades.set(atual, []);
  } else if (l === "}") {
    atual = null;
  } else if (atual) {
    m = l.match(/^(\S+)\s+(\w+)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?(?:\s+"(.*)")?$/);
    if (m) entidades.get(atual).push({ tipo: m[1], nome: m[2], chaves: (m[3] || "").replace(/\s/g, ""), nota: m[4] || "" });
  } else if ((m = l.match(/^(\w+)\s+(\S+)\s+(\w+)\s*:\s*"(.*)"$/))) {
    const [, a, cardinalidade, b] = m;
    const [esq, dir] = [cardinalidade.slice(0, 2), cardinalidade.slice(-2)];
    relacoes.push({ a, b, esq: CARD[esq] || "", dir: CARD[dir] || "", tracejada: cardinalidade.includes("..") });
  }
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fonte = "DejaVu Sans";
let dot = `digraph DER {
  rankdir=LR; splines=true; nodesep=0.45; ranksep=1.5; pad=0.4; bgcolor="white";
  node [shape=plain fontname="${fonte}" fontsize=10];
  edge [fontname="${fonte}" fontsize=9 color="#5b7a5c" arrowhead=none];
`;
for (const [nome, cols] of entidades) {
  const linhasHtml = cols
    .map((c) => {
      const corChave = c.chaves.includes("PK") ? "#fff8e1" : c.chaves.includes("FK") ? "#e8f5e9" : "white";
      const nota = c.nota ? `<FONT COLOR="#7a8f7b" POINT-SIZE="8"> ${esc(c.nota)}</FONT>` : "";
      return `<TR><TD ALIGN="LEFT" BGCOLOR="${corChave}"><FONT POINT-SIZE="8" COLOR="#b26a00"><B>${esc(c.chaves.replace(/,/g, " ")) || "&#160;"}</B></FONT></TD>` +
        `<TD ALIGN="LEFT" BGCOLOR="${corChave}">${esc(c.nome)}</TD>` +
        `<TD ALIGN="LEFT" BGCOLOR="${corChave}"><FONT COLOR="#555555">${esc(c.tipo)}</FONT>${nota}</TD></TR>`;
    })
    .join("");
  dot += `  ${nome} [label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="3" COLOR="#9bb89c">` +
    `<TR><TD COLSPAN="3" BGCOLOR="#43a047"><FONT COLOR="white" POINT-SIZE="12"><B>${esc(nome)}</B></FONT></TD></TR>${linhasHtml}</TABLE>>];\n`;
}
for (const r of relacoes) {
  dot += `  ${r.a} -> ${r.b} [taillabel="${r.esq}" headlabel="${r.dir}" labeldistance=2 ${r.tracejada ? 'style=dashed' : ""}];\n`;
}
dot += "}\n";

const gv = await Graphviz.load();
const svg = gv.layout(dot, "svg", "dot");
fs.writeFileSync(`${saidaBase}.svg`, svg);

const png = new Resvg(svg, {
  background: "white",
  font: { loadSystemFonts: true, defaultFontFamily: fonte },
  fitTo: { mode: "zoom", value: 1.5 },
}).render();
fs.writeFileSync(`${saidaBase}.png`, png.asPng());
console.log(`${entidades.size} entidades, ${relacoes.length} relacionamentos → ${saidaBase}.svg (${(svg.length / 1024) | 0} KB) e .png (${png.width}x${png.height})`);
