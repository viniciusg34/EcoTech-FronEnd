"use strict";

/* ══════════════════════════════════════════════════════════
   eco-a11y.js — Barra de Acessibilidade
   Alto contraste + aumentar/diminuir fonte, seguindo o mesmo
   exemplo citado no PDF do projeto (gov.br). Auto-injeta seu
   próprio HTML/CSS — basta incluir este script em qualquer
   página. Leve: sem dependências, só CSS + localStorage.
══════════════════════════════════════════════════════════ */

(function () {
  const CONTRASTE_KEY = "ecotech_alto_contraste";
  const FONTE_KEY = "ecotech_escala_fonte";
  const ESCALAS = [1, 1.125, 1.25]; // 100% / 112,5% / 125%

  function aplicarPreferencias() {
    const contraste = localStorage.getItem(CONTRASTE_KEY) === "1";
    document.documentElement.toggleAttribute("data-contraste", contraste);

    const escalaIdx = parseInt(localStorage.getItem(FONTE_KEY) || "0", 10);
    document.documentElement.style.setProperty(
      "--a11y-font-scale",
      ESCALAS[escalaIdx] || 1,
    );
  }

  function injetarEstilos() {
    if (document.getElementById("eco-a11y-style")) return;
    const style = document.createElement("style");
    style.id = "eco-a11y-style";
    style.textContent = `
      html { font-size: calc(100% * var(--a11y-font-scale, 1)); }

      #eco-a11y-bar {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--white, #fff);
        border: 1.5px solid var(--sage-100, #d6ebd6);
        border-radius: 999px;
        box-shadow: 0 8px 28px rgba(0,0,0,0.16);
        padding: 6px;
        font-family: "Plus Jakarta Sans", "Poppins", sans-serif;
      }
      #eco-a11y-bar button {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        font-weight: 800;
        color: var(--ink, #1a2e1b);
        transition: background 0.2s, transform 0.15s;
      }
      #eco-a11y-bar button:hover { background: var(--sage-50, #eef5ee); transform: scale(1.08); }
      #eco-a11y-bar button:active { transform: scale(0.94); }
      #eco-a11y-bar button.on { background: var(--sage-500, #3d9140); color: #fff; }
      #eco-a11y-bar .a11y-sep { width: 1px; height: 20px; background: var(--sage-100, #d6ebd6); margin: 0 2px; }
      #eco-a11y-bar .a11y-label { font-size: 10px; font-weight: 700; }

      @media (max-width: 480px) {
        #eco-a11y-bar { bottom: 10px; }
        #eco-a11y-bar button { width: 32px; height: 32px; font-size: 12px; }
      }

      /* ── Alto contraste ──
         Em vez de sobrescrever cor por cor (frágil — cada página
         tem nomes de seção diferentes), inverte as cores da tela
         inteira. Funciona em qualquer página automaticamente.
         Imagens/vídeos recebem uma segunda inversão pra continuarem
         com aparência normal. */
      html[data-contraste] {
        filter: invert(1) hue-rotate(180deg) contrast(1.05);
        background: #fff;
      }
      html[data-contraste] img,
      html[data-contraste] video,
      html[data-contraste] svg image,
      html[data-contraste] .imagem-topo,
      html[data-contraste] [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg);
      }
      html[data-contraste] #eco-a11y-bar {
        filter: invert(1) hue-rotate(180deg);
      }
    `;
    document.head.appendChild(style);
  }

  function injetarBarra() {
    if (document.getElementById("eco-a11y-bar")) return;
    const bar = document.createElement("div");
    bar.id = "eco-a11y-bar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Barra de acessibilidade");
    bar.innerHTML = `
      <button type="button" id="a11y-font-menos" aria-label="Diminuir fonte" title="Diminuir fonte">A-</button>
      <span class="a11y-label" id="a11y-font-pct">100%</span>
      <button type="button" id="a11y-font-mais" aria-label="Aumentar fonte" title="Aumentar fonte">A+</button>
      <span class="a11y-sep"></span>
      <button type="button" id="a11y-contraste" aria-label="Alternar alto contraste" title="Alto contraste">◐</button>
    `;
    document.body.appendChild(bar);

    const atualizarLabel = () => {
      const idx = parseInt(localStorage.getItem(FONTE_KEY) || "0", 10);
      document.getElementById("a11y-font-pct").textContent =
        Math.round(ESCALAS[idx] * 100) + "%";
      document.getElementById("a11y-contraste").classList.toggle(
        "on",
        localStorage.getItem(CONTRASTE_KEY) === "1",
      );
    };

    document.getElementById("a11y-font-mais").addEventListener("click", () => {
      let idx = parseInt(localStorage.getItem(FONTE_KEY) || "0", 10);
      idx = Math.min(idx + 1, ESCALAS.length - 1);
      localStorage.setItem(FONTE_KEY, idx);
      aplicarPreferencias();
      atualizarLabel();
    });
    document.getElementById("a11y-font-menos").addEventListener("click", () => {
      let idx = parseInt(localStorage.getItem(FONTE_KEY) || "0", 10);
      idx = Math.max(idx - 1, 0);
      localStorage.setItem(FONTE_KEY, idx);
      aplicarPreferencias();
      atualizarLabel();
    });
    document.getElementById("a11y-contraste").addEventListener("click", () => {
      const ativo = localStorage.getItem(CONTRASTE_KEY) === "1";
      localStorage.setItem(CONTRASTE_KEY, ativo ? "0" : "1");
      aplicarPreferencias();
      atualizarLabel();
    });

    atualizarLabel();
  }

  aplicarPreferencias(); // aplica cedo, antes mesmo do body existir (evita "flash")

  function iniciar() {
    injetarEstilos();
    injetarBarra();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
