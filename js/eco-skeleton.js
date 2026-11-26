"use strict";

/* ══════════════════════════════════════════════════════════
   eco-skeleton.js — Skeleton loading em todas as telas.
   Usa css/eco-skeleton.css. Carregue DEPOIS do js/api.js e ANTES
   do script da página.

   No HTML:
     class="sk"              valor que vem da API (texto, número, mapa,
                             vídeo...). Sai sozinho quando a página
                             escreve o conteúdo. Largura mínima:
                             style="--sk-w: 8ch"
     data-sk-linhas="5"      num <tbody>: 5 linhas de blocos (as colunas
                             vêm do <thead>; ou use data-sk-colunas="4")
     data-sk-itens="3"       numa lista/grade: 3 cartões de blocos
                             (altura: data-sk-altura="72px")

   O skeleton some quando a página troca o conteúdo (innerHTML,
   textContent, appendChild). Se a API não responder, ele some sozinho
   quando não houver mais pedidos pendentes (evento "eco:api-ocioso"
   do js/api.js) ou depois de 12 s: nunca fica "carregando" para sempre.

   No JS da página (opcional):
     EcoSkeleton.pronto(el)      tira o skeleton de um elemento
     EcoSkeleton.preencher(el)   põe de novo (ex.: ao recarregar a lista)
══════════════════════════════════════════════════════════ */
(function (global) {
  var LIMITE_MS = 12000; // segurança: depois disso, nada fica carregando
  var MSG_FALHA = "Não foi possível carregar agora. Recarregue a página para tentar de novo.";

  var observadores = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function blocoHtml(largura, altura) {
    return (
      '<span class="sk-bloco" style="--sk-w:' + largura + (altura ? ";--sk-h:" + altura : "") + '"></span>'
    );
  }

  /* Larguras variadas para não parecer uma grade de tijolos */
  var LARGURAS = ["70%", "55%", "85%", "40%", "65%", "50%"];

  function linhasTabela(tbody) {
    var n = parseInt(tbody.getAttribute("data-sk-linhas"), 10) || 4;
    var cols = parseInt(tbody.getAttribute("data-sk-colunas"), 10);
    if (!cols) {
      var tabela = tbody.closest("table");
      cols = (tabela && tabela.querySelectorAll("thead th").length) || 3;
    }
    var html = "";
    for (var i = 0; i < n; i++) {
      html += '<tr class="sk-linha" data-sk-temp aria-hidden="true">';
      for (var c = 0; c < cols; c++) html += "<td>" + blocoHtml(LARGURAS[(i + c) % LARGURAS.length]) + "</td>";
      html += "</tr>";
    }
    return html;
  }

  /* data-sk-forma="cartao": ícone em cima, textos e botão embaixo
     (grades de cartões); sem forma: ícone à esquerda e duas linhas. */
  function itensLista(el) {
    var n = parseInt(el.getAttribute("data-sk-itens"), 10) || 3;
    var altura = el.getAttribute("data-sk-altura") || "72px";
    var cartao = el.getAttribute("data-sk-forma") === "cartao";
    var html = "";
    for (var i = 0; i < n; i++) {
      html +=
        '<div class="sk-item' + (cartao ? " sk-cartao" : "") + '" data-sk-temp aria-hidden="true" style="--sk-h:' + altura + '">' +
        '<span class="sk-bloco sk-circulo"></span>' +
        '<span class="sk-textos">' +
        blocoHtml(cartao ? "65%" : LARGURAS[i % LARGURAS.length], "0.95em") +
        blocoHtml(cartao ? "85%" : "35%", "0.75em") +
        (cartao ? blocoHtml("50%", "2.2em") : "") +
        "</span></div>";
    }
    return html;
  }

  function temp(el) {
    return el.querySelectorAll(":scope > [data-sk-temp]");
  }

  function terminarContainer(el) {
    el.removeAttribute("aria-busy");
    var obs = observadores && observadores.get(el);
    if (obs) {
      obs.disconnect();
      observadores.delete(el);
    }
  }

  /* Container de lista/tabela: quando a página põe conteúdo real,
     os blocos provisórios saem (vale para innerHTML e appendChild). */
  function vigiarContainer(el) {
    if (!observadores || typeof MutationObserver === "undefined") return;
    var obs = new MutationObserver(function (mudancas) {
      var chegouReal = mudancas.some(function (m) {
        return Array.prototype.some.call(m.addedNodes, function (n) {
          return !(n.nodeType === 1 && n.hasAttribute("data-sk-temp")) && !(n.nodeType === 3 && !n.textContent.trim());
        });
      });
      var sobrou = temp(el);
      if (chegouReal) Array.prototype.forEach.call(sobrou, function (n) { n.remove(); });
      if (chegouReal || !sobrou.length) terminarContainer(el);
    });
    obs.observe(el, { childList: true });
    observadores.set(el, obs);
  }

  /* Valor (class="sk"): sai quando o texto/conteúdo muda */
  function vigiarValor(el) {
    if (!observadores || typeof MutationObserver === "undefined") return;
    if (observadores.get(el)) return;
    var obs = new MutationObserver(function () {
      pronto(el);
    });
    obs.observe(el, { childList: true, characterData: true, subtree: true });
    observadores.set(el, obs);
  }

  function preencher(el) {
    if (!el) return;
    if (el.hasAttribute("data-sk-linhas")) {
      el.innerHTML = linhasTabela(el);
      el.setAttribute("aria-busy", "true");
      vigiarContainer(el);
    } else if (el.hasAttribute("data-sk-itens")) {
      el.innerHTML = itensLista(el);
      el.setAttribute("aria-busy", "true");
      vigiarContainer(el);
    } else {
      el.classList.add("sk");
      el.setAttribute("aria-busy", "true");
      vigiarValor(el);
    }
  }

  function pronto(el) {
    if (!el) return;
    el.classList.remove("sk");
    el.removeAttribute("aria-busy");
    Array.prototype.forEach.call(temp(el), function (n) { n.remove(); });
    var obs = observadores && observadores.get(el);
    if (obs) {
      obs.disconnect();
      observadores.delete(el);
    }
  }

  /* A API parou de responder (ou demorou demais): tira o que sobrou.
     Lista que ficou só com blocos provisórios ganha um aviso. */
  function limparTudo() {
    document.querySelectorAll(".sk").forEach(pronto);
    document.querySelectorAll("[data-sk-linhas], [data-sk-itens]").forEach(function (el) {
      var sobrou = temp(el);
      if (!sobrou.length) return terminarContainer(el);
      var soProvisorio = el.children.length === sobrou.length;
      Array.prototype.forEach.call(sobrou, function (n) { n.remove(); });
      if (soProvisorio) {
        if (el.tagName === "TBODY") {
          var cols = (el.closest("table") && el.closest("table").querySelectorAll("thead th").length) || 1;
          el.innerHTML = '<tr><td class="sk-vazio" colspan="' + cols + '">' + MSG_FALHA + "</td></tr>";
        } else {
          el.innerHTML = '<p class="sk-vazio">' + MSG_FALHA + "</p>";
        }
      }
      terminarContainer(el);
    });
  }

  function iniciar() {
    document.querySelectorAll("[data-sk-linhas], [data-sk-itens]").forEach(preencher);
    document.querySelectorAll(".sk").forEach(function (el) {
      el.setAttribute("aria-busy", "true");
      vigiarValor(el);
    });

    var pediuAlgo = !!(global.Api && typeof global.Api.pendentes === "function" && global.Api.pendentes() > 0);
    var tempo = null;
    document.addEventListener("eco:api-ativo", function () {
      pediuAlgo = true;
      clearTimeout(tempo);
    });
    document.addEventListener("eco:api-ocioso", function () {
      clearTimeout(tempo);
      // dá tempo de a página desenhar a resposta antes de conferir
      tempo = setTimeout(function () {
        if (pediuAlgo && global.Api && typeof global.Api.pendentes === "function" && global.Api.pendentes() === 0) limparTudo();
      }, 600);
    });
    setTimeout(limparTudo, LIMITE_MS);
  }

  // O script fica no fim do <body>: os elementos de cima já existem
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  global.EcoSkeleton = { preencher: preencher, pronto: pronto, limpar: limparTudo };
})(window);
