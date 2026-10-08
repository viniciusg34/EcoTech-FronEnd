"use strict";

/* ══════════════════════════════════════════════════════════
   eco-animate.js — Animações leves (SVG + CSS puro, sem
   bibliotecas):
   1) Sistema de estações do ano (verão/outono/inverno/primavera)
      com folhas/flocos/pétalas caindo no fundo de TODAS as
      páginas — não só nas fotos, no site inteiro.
   2) Números que contam ao entrar na tela ([data-count-to])
   3) Anéis de progresso em SVG que "desenham" ao entrar na
      tela ([data-progress-ring])
   Tudo via IntersectionObserver (leve, nativo) e respeita
   prefers-reduced-motion.
══════════════════════════════════════════════════════════ */

const ECO_ESTACAO_KEY = "ecotech_estacao";

/* ── Define as 4 estações: nome, emoji, formato do elemento
   caindo, e cor (clara/escura de cada tema). Hemisfério SUL
   (Brasil), por isso os meses batem diferente do hemisfério
   norte. ── */
const ECO_ESTACOES = {
  verao: {
    nome: "Verão",
    emoji: "☀️",
    forma: "folha",
    corClaro: "rgba(61, 145, 64, 0.4)",
    corEscuro: "rgba(120, 200, 120, 0.5)",
  },
  outono: {
    nome: "Outono",
    emoji: "🍂",
    forma: "folhaOutono",
    corClaro: "rgba(191, 110, 34, 0.5)",
    corEscuro: "rgba(224, 150, 80, 0.55)",
  },
  inverno: {
    nome: "Inverno",
    emoji: "❄️",
    forma: "floco",
    corClaro: "rgba(90, 140, 180, 0.45)",
    corEscuro: "rgba(190, 220, 240, 0.55)",
  },
  primavera: {
    nome: "Primavera",
    emoji: "🌸",
    forma: "petala",
    corClaro: "rgba(214, 110, 150, 0.45)",
    corEscuro: "rgba(240, 170, 195, 0.55)",
  },
};

/* ── Detecta a estação atual pelo mês (hemisfério sul) ── */
function ecoEstacaoPorData() {
  const mes = new Date().getMonth() + 1; // 1–12
  if (mes === 12 || mes <= 2) return "verao";
  if (mes >= 3 && mes <= 5) return "outono";
  if (mes >= 6 && mes <= 8) return "inverno";
  return "primavera";
}

function ecoEstacaoAtual() {
  const manual = localStorage.getItem(ECO_ESTACAO_KEY);
  if (manual && ECO_ESTACOES[manual]) return manual;
  return ecoEstacaoPorData();
}

function ecoDefinirEstacao(chave) {
  if (chave === "auto") {
    localStorage.removeItem(ECO_ESTACAO_KEY);
  } else if (ECO_ESTACOES[chave]) {
    localStorage.setItem(ECO_ESTACAO_KEY, chave);
  }
  document.dispatchEvent(new CustomEvent("eco-estacao-mudou"));
}

(function () {
  const SEM_MOVIMENTO = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ── Formas em SVG por estação (viewBox 0 0 24 24) ── */
  const ECO_FORMAS = {
    folha: `<path d="M12 1.5C6.5 1.5 2 6.2 2 12c0 7 10 12 10 12s10-5 10-12c0-5.8-4.5-10.5-10-10.5z" fill="currentColor"/><path d="M12 4v18" stroke="rgba(0,0,0,0.15)" stroke-width="1" fill="none"/>`,
    folhaOutono: `<path d="M12 1.5C6.5 1.5 2 6.2 2 12c0 7 10 12 10 12s10-5 10-12c0-5.8-4.5-10.5-10-10.5z" fill="currentColor"/><path d="M12 4v18" stroke="rgba(0,0,0,0.18)" stroke-width="1" fill="none"/>`,
    floco: `<g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="1.5" x2="12" y2="22.5"/><line x1="3" y1="6.75" x2="21" y2="17.25"/><line x1="3" y1="17.25" x2="21" y2="6.75"/><line x1="12" y1="1.5" x2="9" y2="4.5"/><line x1="12" y1="1.5" x2="15" y2="4.5"/><line x1="12" y1="22.5" x2="9" y2="19.5"/><line x1="12" y1="22.5" x2="15" y2="19.5"/></g>`,
    petala: `<g fill="currentColor"><ellipse cx="12" cy="6.5" rx="3.4" ry="5.5"/><ellipse cx="12" cy="17.5" rx="3.4" ry="5.5"/><ellipse cx="6.5" cy="12" rx="5.5" ry="3.4"/><ellipse cx="17.5" cy="12" rx="5.5" ry="3.4"/></g><circle cx="12" cy="12" r="2.6" fill="#f5a623"/>`,
  };

  function corDaEstacao(dados) {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? dados.corEscuro
      : dados.corClaro;
  }

  /* ── Gera o SVG de um elemento (folha/floco/pétala) já com o
     visual da estação atual. Tamanho bem maior que antes (32px,
     era 20-22px) pra ficar nítido e visível de verdade. ── */
  function ecoElementoSVG(i, dados) {
    const forma = ECO_FORMAS[dados.forma] || ECO_FORMAS.folha;
    return `
      <svg class="eco-leaf eco-leaf-${i % 4}" viewBox="0 0 24 24"
           style="color:${corDaEstacao(dados)}" aria-hidden="true">
        ${forma}
      </svg>`;
  }

  function ecoAtualizarCoresExistentes() {
    const dados = ECO_ESTACOES[ecoEstacaoAtual()];
    document.querySelectorAll(".eco-leaf").forEach((svg) => {
      svg.style.color = corDaEstacao(dados);
    });
  }

  /* ── Cria os elementos caindo. Agora SEMPRE inclui a camada
     ambiente (fundo da página inteira) em TODA página, além dos
     containers .hero-leaves específicos (fotos) quando existirem
     — antes a camada ambiente só entrava se não tivesse nenhum
     hero-leaves; agora as duas coisas coexistem. ── */
  function criarFolhas() {
    if (SEM_MOVIMENTO) return;
    const dados = ECO_ESTACOES[ecoEstacaoAtual()];

    document.querySelectorAll(".hero-leaves").forEach((container) => {
      if (container.dataset.folhasProntas) return;
      container.dataset.folhasProntas = "1";
      const qtd = parseInt(container.dataset.qtdFolhas || "7", 10);
      let html = "";
      for (let i = 0; i < qtd; i++) html += ecoElementoSVG(i, dados);
      container.insertAdjacentHTML("beforeend", html);
    });

    if (!document.getElementById("eco-ambient-leaves")) {
      const ambiente = document.createElement("div");
      ambiente.id = "eco-ambient-leaves";
      ambiente.className = "hero-leaves hero-leaves--ambiente";
      ambiente.dataset.folhasProntas = "1";
      let html = "";
      for (let i = 0; i < 9; i++) html += ecoElementoSVG(i, dados);
      ambiente.innerHTML = html;
      document.body.appendChild(ambiente);
    }
  }

  function ecoRecriarFolhas() {
    document.querySelectorAll(".eco-leaf").forEach((el) => el.remove());
    document.querySelectorAll(".hero-leaves, #eco-ambient-leaves").forEach((el) => {
      delete el.dataset.folhasProntas;
    });
    criarFolhas();
  }

  /* ── Botão flutuante pra escolher a estação (some no canto,
     igual o botão de tema/acessibilidade) ── */
  function ecoInjetarSeletorEstacao() {
    if (document.getElementById("eco-estacao-btn")) return;
    const btn = document.createElement("button");
    btn.id = "eco-estacao-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Escolher estação do ano");
    btn.title = "Estação do ano";

    const menu = document.createElement("div");
    menu.id = "eco-estacao-menu";
    menu.innerHTML =
      '<div class="eco-estacao-titulo">Estação do ano</div>' +
      Object.entries(ECO_ESTACOES)
        .map(
          ([chave, d]) =>
            `<button type="button" data-estacao="${chave}">${d.emoji} ${d.nome}</button>`,
        )
        .join("") +
      '<button type="button" data-estacao="auto" class="eco-estacao-auto">🔄 Automático (data de hoje)</button>';

    function atualizarBotao() {
      const atual = ECO_ESTACOES[ecoEstacaoAtual()];
      btn.textContent = atual.emoji;
      menu.querySelectorAll("button[data-estacao]").forEach((b) => {
        b.classList.toggle("ativo", b.dataset.estacao === ecoEstacaoAtual());
      });
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("aberto");
    });
    document.addEventListener("click", () => menu.classList.remove("aberto"));
    menu.addEventListener("click", (e) => e.stopPropagation());

    menu.querySelectorAll("button[data-estacao]").forEach((b) => {
      b.addEventListener("click", () => {
        ecoDefinirEstacao(b.dataset.estacao);
        atualizarBotao();
        ecoRecriarFolhas();
        menu.classList.remove("aberto");
      });
    });

    document.body.appendChild(btn);
    document.body.appendChild(menu);
    atualizarBotao();
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
    ecoInjetarSeletorEstacao();
    iniciarObservadores();

    // Se o tema mudar (claro/escuro), reajusta a cor das folhas
    // já criadas, sem precisar recriar tudo.
    const btnTema = document.getElementById("theme-toggle");
    if (btnTema) btnTema.addEventListener("click", () => setTimeout(ecoAtualizarCoresExistentes, 50));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
