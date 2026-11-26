"use strict";

/* ══════════════════════════════════════════════════════════
   eco-acessibilidade.js — Barra de acessibilidade (Desafio Plus).
   Dois mecanismos, em todas as páginas:
     1. Contraste: alterna entre fundo claro/fonte escura e
        fundo escuro/fonte clara (o mesmo tema `eco-theme` do site).
     2. Tamanho da fonte: diminuir (A−), padrão (A) e aumentar (A+).
   A escolha de fonte fica em localStorage ("eco-fonte"); é só uma
   preferência visual. Carregue no fim do <body>.
══════════════════════════════════════════════════════════ */
(function () {
  if (document.getElementById("eco-a11y")) return;

  var KEY_FONTE = "eco-fonte";
  var PASSOS = [85, 100, 115, 130, 150]; // % do tamanho padrão do navegador
  var PADRAO = 1;

  function lerPasso() {
    try {
      var n = parseInt(localStorage.getItem(KEY_FONTE), 10);
      return n >= 0 && n < PASSOS.length ? n : PADRAO;
    } catch (_) {
      return PADRAO;
    }
  }

  var passo = lerPasso();

  function aplicarFonte() {
    document.documentElement.style.fontSize = passo === PADRAO ? "" : PASSOS[passo] + "%";
    try {
      if (passo === PADRAO) localStorage.removeItem(KEY_FONTE);
      else localStorage.setItem(KEY_FONTE, String(passo));
    } catch (_) {}
    var menos = document.getElementById("eco-a11y-menos");
    var mais = document.getElementById("eco-a11y-mais");
    if (menos) menos.disabled = passo === 0;
    if (mais) mais.disabled = passo === PASSOS.length - 1;
    var rotulo = document.getElementById("eco-a11y-nivel");
    if (rotulo) rotulo.textContent = PASSOS[passo] + "%";
    medirBarra();
  }

  /* ── Contraste: reaproveita o tema do site ── */
  function temaEscuro() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function alternarContraste() {
    var botaoTema = document.getElementById("theme-toggle");
    if (botaoTema) {
      botaoTema.click(); // mantém ícone, mapa e menu em sincronia
      atualizarContraste();
      return;
    }
    var novo = temaEscuro() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", novo);
    try {
      localStorage.setItem("eco-theme", novo);
    } catch (_) {}
    atualizarContraste();
  }

  function atualizarContraste() {
    var b = document.getElementById("eco-a11y-contraste");
    if (!b) return;
    b.setAttribute("aria-pressed", temaEscuro() ? "true" : "false");
    b.querySelector("span").textContent = temaEscuro() ? "Fundo escuro / fonte clara" : "Fundo claro / fonte escura";
  }

  /* ── Estilo (isolado: prefixo eco-a11y) ── */
  var css =
    "#eco-a11y{position:relative;z-index:10001;align-self:stretch;width:100%;display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;" +
    "padding:5px 14px;background:#1F2A1F;color:#fff;font:600 13px/1.2 'Plus Jakarta Sans','Poppins',system-ui,sans-serif;box-sizing:border-box}" +
    "#eco-a11y .eco-a11y-titulo{margin-right:auto;opacity:.85;font-weight:600}" +
    "#eco-a11y button{all:unset;box-sizing:border-box;cursor:pointer;padding:5px 11px;border-radius:8px;border:1.5px solid rgba(255,255,255,.55);" +
    "color:#fff;font:700 13px/1.2 inherit;font-family:inherit;display:inline-flex;align-items:center;gap:6px}" +
    "#eco-a11y button:hover:not(:disabled){background:rgba(255,255,255,.16)}" +
    "#eco-a11y button:focus-visible{outline:3px solid #ffd54f;outline-offset:2px}" +
    "#eco-a11y button:disabled{opacity:.4;cursor:not-allowed}" +
    "#eco-a11y button[aria-pressed='true']{background:#fff;color:#1F2A1F}" +
    "#eco-a11y .eco-a11y-nivel{min-width:38px;text-align:center;opacity:.85}" +
    ".header{top:var(--eco-a11y-offset,0px)!important}" + // menus fixos descem junto com a barra
    // botões flutuantes (voltar e tema) também descem, para não ficarem embaixo da barra
    ".btn-back,.btn-back-float,.theme-toggle-float,.eco-voltar--fixa,body>.theme-toggle{margin-top:var(--eco-a11y-offset,0px)}" +
    "@media print{#eco-a11y{display:none!important}}";

  var style = document.createElement("style");
  style.id = "eco-a11y-style";
  style.textContent = css;
  document.head.appendChild(style);

  var barra = document.createElement("div");
  barra.id = "eco-a11y";
  barra.setAttribute("role", "region");
  barra.setAttribute("aria-label", "Barra de acessibilidade");
  barra.innerHTML =
    '<span class="eco-a11y-titulo">Acessibilidade</span>' +
    '<button type="button" id="eco-a11y-menos" aria-label="Diminuir o tamanho da fonte" title="Diminuir fonte">A−</button>' +
    '<span class="eco-a11y-nivel" id="eco-a11y-nivel" aria-live="polite"></span>' +
    '<button type="button" id="eco-a11y-reset" aria-label="Restaurar o tamanho padrão da fonte" title="Tamanho padrão">A</button>' +
    '<button type="button" id="eco-a11y-mais" aria-label="Aumentar o tamanho da fonte" title="Aumentar fonte">A+</button>' +
    '<button type="button" id="eco-a11y-contraste" aria-pressed="false" aria-label="Alternar contraste entre fundo escuro com fonte clara e fundo claro com fonte escura">◐ <span></span></button>';
  document.body.insertBefore(barra, document.body.firstChild);

  /* A barra rola com a página; os menus fixos acompanham a altura que sobra dela */
  function medirBarra() {
    var h = barra.offsetHeight || 0;
    document.documentElement.style.setProperty("--eco-a11y-offset", Math.max(0, h - (window.scrollY || 0)) + "px");
  }
  window.addEventListener("scroll", medirBarra, { passive: true });
  window.addEventListener("resize", medirBarra);
  // A barra pode quebrar em duas linhas depois de montada (celular, fonte maior):
  // mede de novo sempre que o tamanho dela mudar.
  if (window.ResizeObserver) new ResizeObserver(medirBarra).observe(barra);

  document.getElementById("eco-a11y-menos").addEventListener("click", function () {
    if (passo > 0) {
      passo--;
      aplicarFonte();
    }
  });
  document.getElementById("eco-a11y-mais").addEventListener("click", function () {
    if (passo < PASSOS.length - 1) {
      passo++;
      aplicarFonte();
    }
  });
  document.getElementById("eco-a11y-reset").addEventListener("click", function () {
    passo = PADRAO;
    aplicarFonte();
  });
  document.getElementById("eco-a11y-contraste").addEventListener("click", alternarContraste);

  new MutationObserver(atualizarContraste).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  aplicarFonte();
  atualizarContraste();
})();
