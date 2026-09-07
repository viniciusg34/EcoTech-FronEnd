"use strict";

/* ══════════════════════════════════════════════════════════
   eco-animate.js — Pequenas animações leves (SVG + CSS puro,
   sem bibliotecas):
   1) Folhinhas flutuando em seções .hero-leaves
   2) Números que contam ao entrar na tela ([data-count-to])
   3) Anéis de progresso em SVG que "desenham" ao entrar na
      tela ([data-progress-ring])
   Tudo via IntersectionObserver (leve, nativo) e respeita
   prefers-reduced-motion.
══════════════════════════════════════════════════════════ */

(function () {
  const SEM_MOVIMENTO = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ── 1) Folhinhas flutuando ── */
  function criarFolhas() {
    const containers = document.querySelectorAll(".hero-leaves");
    if (SEM_MOVIMENTO) return;

    const FOLHA_SVG = (i) => `
      <svg class="eco-leaf eco-leaf-${i % 4}" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C7 2 3 6 3 11c0 6 9 11 9 11s9-5 9-11c0-5-4-9-9-9z"
              fill="currentColor"/>
      </svg>`;

    containers.forEach((container) => {
      if (container.dataset.folhasProntas) return;
      container.dataset.folhasProntas = "1";
      const qtd = parseInt(container.dataset.qtdFolhas || "6", 10);
      let html = "";
      for (let i = 0; i < qtd; i++) html += FOLHA_SVG(i);
      container.insertAdjacentHTML("beforeend", html);
    });

    // Páginas sem uma seção de destaque própria (telas administrativas,
    // formulários simples, etc.) ganham uma camada ambiente e discreta
    // de folhas fixa na tela, pra nenhuma tela ficar "parada".
    if (!containers.length && !document.getElementById("eco-ambient-leaves")) {
      const ambiente = document.createElement("div");
      ambiente.id = "eco-ambient-leaves";
      ambiente.className = "hero-leaves hero-leaves--ambiente";
      ambiente.dataset.folhasProntas = "1";
      let html = "";
      for (let i = 0; i < 5; i++) html += FOLHA_SVG(i);
      ambiente.innerHTML = html;
      document.body.appendChild(ambiente);
    }
  }

  /* ── 2) Contadores numéricos ── */
  function animarContador(el) {
    const alvo = parseFloat(el.dataset.countTo);
    if (isNaN(alvo)) return;
    const casasDecimais = (el.dataset.countTo.split(".")[1] || "").length;
    const prefixo = el.dataset.countPrefix || "";
    const sufixo = el.dataset.countSuffix || "";
    const duracao = SEM_MOVIMENTO ? 0 : parseInt(el.dataset.countMs || "1400", 10);

    if (duracao === 0) {
      el.textContent = prefixo + alvo.toLocaleString("pt-BR") + sufixo;
      return;
    }

    const inicio = performance.now();
    function passo(agora) {
      const progresso = Math.min((agora - inicio) / duracao, 1);
      const facilitado = 1 - Math.pow(1 - progresso, 3); // ease-out cúbico
      const valorAtual = alvo * facilitado;
      el.textContent =
        prefixo +
        valorAtual.toLocaleString("pt-BR", {
          minimumFractionDigits: casasDecimais,
          maximumFractionDigits: casasDecimais,
        }) +
        sufixo;
      if (progresso < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  /* ── 3) Anéis de progresso SVG ── */
  function animarAnel(el) {
    const alvo = Math.max(0, Math.min(100, parseFloat(el.dataset.progressRing) || 0));
    const circulo = el.querySelector("circle.eco-ring-fg");
    if (!circulo) return;
    const raio = circulo.r.baseVal.value;
    const perimetro = 2 * Math.PI * raio;
    circulo.style.strokeDasharray = `${perimetro}`;
    circulo.style.strokeDashoffset = `${perimetro}`;
    // força reflow antes de animar (senão o navegador "pula" direto pro fim)
    circulo.getBoundingClientRect();
    const offsetFinal = perimetro - (alvo / 100) * perimetro;
    circulo.style.transition = SEM_MOVIMENTO
      ? "none"
      : "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)";
    circulo.style.strokeDashoffset = SEM_MOVIMENTO ? offsetFinal : `${offsetFinal}`;
  }

  function iniciarObservadores() {
    const alvos = document.querySelectorAll(
      "[data-count-to], [data-progress-ring]",
    );
    if (!alvos.length) return;

    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          const el = entrada.target;
          if (el.dataset.countTo) animarContador(el);
          if (el.dataset.progressRing) animarAnel(el);
          obs.unobserve(el);
        });
      },
      { threshold: 0.4 },
    );

    alvos.forEach((el) => obs.observe(el));
  }

  function iniciar() {
    criarFolhas();
    iniciarObservadores();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
