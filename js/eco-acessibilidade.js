"use strict";

/* ══════════════════════════════════════════════════════════
   eco-acessibilidade.js — Painel de tema e acessibilidade (Desafio Plus).
   O botão de tema da página (#theme-toggle, o ☀️/🌙) passa a abrir um
   painel pequeno com:
     1. Tema e contraste: ☀️ fundo claro / fonte escura e
        🌙 fundo escuro / fonte clara (o mesmo tema `eco-theme` do site).
     2. Tamanho da fonte: diminuir (A−), padrão (A) e aumentar (A+).
   A troca de tema usa a lógica que cada página já tem no botão (ícone,
   mapa e menu continuam em sincronia). A fonte fica em localStorage
   ("eco-fonte"); é só uma preferência visual. Carregue no fim do <body>.
══════════════════════════════════════════════════════════ */
(function () {
  if (document.getElementById("eco-a11y-painel")) return;

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
    var reset = document.getElementById("eco-a11y-reset");
    if (menos) menos.disabled = passo === 0;
    if (mais) mais.disabled = passo === PASSOS.length - 1;
    if (reset) reset.setAttribute("aria-pressed", passo === PADRAO ? "true" : "false");
    var rotulo = document.getElementById("eco-a11y-nivel");
    if (rotulo) rotulo.textContent = PASSOS[passo] + "%";
    posicionar();
  }

  /* ── Tema: usa o botão da própria página ── */
  function temaAtual() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  var passando = false; // clique "de verdade" no botão de tema (troca o tema)
  function definirTema(alvo) {
    if (temaAtual() === alvo) return;
    var botao = document.getElementById("theme-toggle");
    if (botao) {
      passando = true;
      try {
        botao.click(); // a página troca o tema do jeito dela
      } finally {
        passando = false;
      }
    }
    if (temaAtual() !== alvo) {
      // página sem lógica própria de tema: troca aqui mesmo
      document.documentElement.setAttribute("data-theme", alvo);
      try {
        localStorage.setItem("eco-theme", alvo);
      } catch (_) {}
    }
  }

  function atualizarTema() {
    var escuro = temaAtual() === "dark";
    var claroBtn = document.getElementById("eco-a11y-claro");
    var escuroBtn = document.getElementById("eco-a11y-escuro");
    if (claroBtn) claroBtn.setAttribute("aria-pressed", escuro ? "false" : "true");
    if (escuroBtn) escuroBtn.setAttribute("aria-pressed", escuro ? "true" : "false");
  }

  /* ── Estilo (isolado: prefixo eco-a11y) ── */
  var css =
    "#eco-a11y-painel{position:fixed;z-index:10003;width:min(300px,calc(100vw - 24px));box-sizing:border-box;padding:16px;" +
    "background:#1F2A1F;color:#fff;border-radius:20px;box-shadow:0 18px 48px rgba(0,0,0,.35);" +
    "font:600 .875rem/1.3 'Plus Jakarta Sans','Poppins',system-ui,sans-serif;text-align:left}" +
    "#eco-a11y-painel[hidden]{display:none}" +
    "#eco-a11y-painel *{box-sizing:border-box}" +
    // o CSS de cada página não pode mudar o painel (ex.: login.css estiliza todo <small>)
    "#eco-a11y-painel p,#eco-a11y-painel span,#eco-a11y-painel small,#eco-a11y-painel b{color:inherit;margin:0;padding:0;" +
    "text-align:inherit;font-family:inherit;letter-spacing:normal;text-transform:none;background:none;border:0}" +
    "#eco-a11y-painel .eco-a11y-topo{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}" +
    "#eco-a11y-painel .eco-a11y-titulo{font-size:1rem;font-weight:800}" +
    "#eco-a11y-painel .eco-a11y-secao{font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;opacity:.75;margin:4px 0 8px}" +
    "#eco-a11y-painel button{all:unset;box-sizing:border-box;cursor:pointer;border-radius:12px;border:1.5px solid rgba(255,255,255,.5);" +
    "color:#fff;font:inherit;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:6px 10px}" +
    "#eco-a11y-painel button:hover:not(:disabled){background:rgba(255,255,255,.14)}" +
    "#eco-a11y-painel button:focus-visible{outline:3px solid #ffd54f;outline-offset:2px}" +
    "#eco-a11y-painel button:disabled{opacity:.4;cursor:not-allowed}" +
    "#eco-a11y-painel button[aria-pressed='true']{background:#fff;color:#1F2A1F;border-color:#fff}" +
    "#eco-a11y-painel .eco-a11y-fechar{width:36px;min-height:36px;padding:0;border-radius:50%;font-size:.85rem}" +
    "#eco-a11y-painel .eco-a11y-temas{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}" +
    "#eco-a11y-painel .eco-a11y-tema{flex-direction:column;gap:2px;padding:10px 8px;text-align:center}" +
    "#eco-a11y-painel .eco-a11y-tema b{font-size:1.25rem;line-height:1}" +
    "#eco-a11y-painel .eco-a11y-tema small{display:block;font-size:.7rem;font-weight:600;opacity:.85;line-height:1.25;text-align:center}" +
    "#eco-a11y-painel .eco-a11y-fonte{display:grid;grid-template-columns:1fr auto 1fr 1fr;align-items:center;gap:8px}" +
    "#eco-a11y-painel .eco-a11y-nivel{min-width:46px;text-align:center;opacity:.9}" +
    "#theme-toggle[aria-expanded='true']{outline:3px solid #ffd54f;outline-offset:2px}" +
    "@media print{#eco-a11y-painel{display:none!important}}";

  var style = document.createElement("style");
  style.id = "eco-a11y-style";
  style.textContent = css;
  document.head.appendChild(style);

  var painel = document.createElement("div");
  painel.id = "eco-a11y-painel";
  painel.setAttribute("role", "dialog");
  painel.setAttribute("aria-label", "Tema e acessibilidade");
  painel.hidden = true;
  painel.innerHTML =
    '<div class="eco-a11y-topo">' +
    '<span class="eco-a11y-titulo">Acessibilidade</span>' +
    '<button type="button" class="eco-a11y-fechar" id="eco-a11y-fechar" aria-label="Fechar" title="Fechar">✕</button>' +
    "</div>" +
    '<p class="eco-a11y-secao" id="eco-a11y-rot-tema">Tema e contraste</p>' +
    '<div class="eco-a11y-temas" role="group" aria-labelledby="eco-a11y-rot-tema">' +
    '<button type="button" class="eco-a11y-tema" id="eco-a11y-claro" aria-pressed="false" title="Fundo claro e fonte escura">' +
    '<b aria-hidden="true">☀️</b>Claro<small>fundo claro, fonte escura</small></button>' +
    '<button type="button" class="eco-a11y-tema" id="eco-a11y-escuro" aria-pressed="false" title="Fundo escuro e fonte clara">' +
    '<b aria-hidden="true">🌙</b>Escuro<small>fundo escuro, fonte clara</small></button>' +
    "</div>" +
    '<p class="eco-a11y-secao" id="eco-a11y-rot-fonte">Tamanho da fonte</p>' +
    '<div class="eco-a11y-fonte" role="group" aria-labelledby="eco-a11y-rot-fonte">' +
    '<button type="button" id="eco-a11y-menos" aria-label="Diminuir o tamanho da fonte" title="Diminuir fonte">A−</button>' +
    '<span class="eco-a11y-nivel" id="eco-a11y-nivel" aria-live="polite"></span>' +
    '<button type="button" id="eco-a11y-reset" aria-label="Tamanho padrão da fonte" title="Tamanho padrão">A</button>' +
    '<button type="button" id="eco-a11y-mais" aria-label="Aumentar o tamanho da fonte" title="Aumentar fonte">A+</button>' +
    "</div>";
  document.body.appendChild(painel);

  /* ── Abrir, posicionar e fechar ── */
  function botaoTema() {
    return document.getElementById("theme-toggle");
  }

  // Embaixo do botão (ou em cima, se não couber), alinhado à direita dele
  function posicionar() {
    var botao = botaoTema();
    if (painel.hidden || !botao) return;
    var r = botao.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var w = painel.offsetWidth;
    var h = painel.offsetHeight;
    var esquerda = Math.min(Math.max(12, r.right - w), vw - w - 12);
    var topo = r.bottom + 10;
    if (topo + h > vh - 12 && r.top - h - 10 >= 12) topo = r.top - h - 10;
    painel.style.left = Math.max(12, esquerda) + "px";
    painel.style.top = Math.max(12, topo) + "px";
  }

  var pendente = false;
  function posicionarDepois() {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(function () {
      pendente = false;
      posicionar();
    });
  }

  function abrir() {
    var botao = botaoTema();
    painel.hidden = false;
    if (botao) botao.setAttribute("aria-expanded", "true");
    atualizarTema();
    posicionar();
    var foco = painel.querySelector(".eco-a11y-tema[aria-pressed='true']") || painel.querySelector("button");
    if (foco) foco.focus();
  }

  function fechar(voltarFoco) {
    if (painel.hidden) return;
    painel.hidden = true;
    var botao = botaoTema();
    if (botao) {
      botao.setAttribute("aria-expanded", "false");
      if (voltarFoco) botao.focus();
    }
  }

  /* O botão de tema abre/fecha o painel. O clique é pego antes de chegar
     no botão (fase de captura), para a página não trocar o tema sozinha. */
  var botaoInicial = botaoTema();
  if (botaoInicial) {
    botaoInicial.setAttribute("aria-haspopup", "dialog");
    botaoInicial.setAttribute("aria-expanded", "false");
    botaoInicial.setAttribute("aria-controls", "eco-a11y-painel");
    botaoInicial.setAttribute("aria-label", "Tema e acessibilidade");
    botaoInicial.setAttribute("title", "Tema e acessibilidade");
  }
  window.addEventListener(
    "click",
    function (e) {
      if (passando) return;
      var alvo = e.target && e.target.closest ? e.target.closest("#theme-toggle") : null;
      if (!alvo) return;
      e.preventDefault();
      e.stopPropagation();
      if (painel.hidden) abrir();
      else fechar(false);
    },
    true,
  );

  // Clicar fora fecha
  document.addEventListener("pointerdown", function (e) {
    if (painel.hidden) return;
    if (painel.contains(e.target)) return;
    var botao = botaoTema();
    if (botao && botao.contains(e.target)) return;
    fechar(false);
  });
  // Esc fecha e volta o foco para o botão
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !painel.hidden) fechar(true);
  });
  // Foco saiu do painel (Tab para fora): fecha
  painel.addEventListener("focusout", function (e) {
    var para = e.relatedTarget;
    var botao = botaoTema();
    if (para && !painel.contains(para) && para !== botao) fechar(false);
  });
  window.addEventListener("scroll", posicionarDepois, { passive: true });
  window.addEventListener("resize", posicionarDepois);

  /* ── Ações do painel ── */
  document.getElementById("eco-a11y-fechar").addEventListener("click", function () {
    fechar(true);
  });
  document.getElementById("eco-a11y-claro").addEventListener("click", function () {
    definirTema("light");
  });
  document.getElementById("eco-a11y-escuro").addEventListener("click", function () {
    definirTema("dark");
  });
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

  new MutationObserver(atualizarTema).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  aplicarFonte();
  atualizarTema();
})();
