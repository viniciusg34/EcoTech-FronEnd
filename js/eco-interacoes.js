"use strict";

/* ══════════════════════════════════════════════════════════
   eco-interacoes.js — Micro-interações genéricas do site
   (scroll suave, ripple, tilt 3D, transição de tema, barra de
   progresso de leitura, reveal-ao-rolar e confete/celebração).

   IMPORTANTE: cada efeito abaixo é uma IIFE isolada, sem
   depender das outras. Pra desligar ou ajustar um efeito,
   mexa só no bloco dele — nada aqui é compartilhado entre
   blocos de propósito (fácil de alterar um sem quebrar outro).

   Inclua depois de eco-animate.js em todas as páginas:
     <script src="js/eco-interacoes.js"></script>
══════════════════════════════════════════════════════════ */

const ECO_REDUZIR_MOVIMENTO = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/* ══════════════════════════════════════════════════════════
   1) SCROLL SUAVE
   (o efeito em si é só CSS — `scroll-behavior: smooth` em
   eco-interacoes.css. Nada de JS necessário aqui.)
══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   2) RIPPLE AO CLICAR EM BOTÕES
   Só nos botões de "ação" (cadastrar, baixar, confirmar, voltar
   etc). NÃO inclui .icon-btn nem .theme-toggle de propósito:
   o avatar/menu do usuário guarda um dropdown como filho direto
   dele, e "overflow:hidden" (que o ripple precisa) cortaria
   esse dropdown fora da tela. Pra adicionar o ripple em algum
   botão novo no futuro, só acrescentar o seletor na lista
   abaixo — não precisa mexer em mais nada.
══════════════════════════════════════════════════════════ */
(function () {
  if (ECO_REDUZIR_MOVIMENTO) return;

  const SELETOR_RIPPLE = [
    "button:not(.icon-btn):not(.theme-toggle)",
    ".btn",
    ".btn-primary",
    ".btn-ghost",
    ".btn-danger",
    ".btn-secondary",
    ".btn-outline-white",
    ".btn-white",
    ".btn-block",
    ".btn-submit",
    ".btn-submit-account",
    ".btn-nav",
    ".btn-back-pill",
    ".btn-back",
    ".btn-back-float",
    ".btn-cancelar",
    ".btn-confirmar-excluir",
    ".btn-excluir",
    ".btn-salvar",
    ".btn-download",
    ".botao-principal",
    ".botao-contorno",
  ].join(", ");

  function criarOnda(evento, alvo) {
    const retangulo = alvo.getBoundingClientRect();
    const tamanho = Math.max(retangulo.width, retangulo.height);
    const cx = evento.clientX ?? retangulo.left + retangulo.width / 2;
    const cy = evento.clientY ?? retangulo.top + retangulo.height / 2;

    const onda = document.createElement("span");
    onda.className = "eco-ripple";
    onda.style.width = onda.style.height = `${tamanho}px`;
    onda.style.left = `${cx - retangulo.left - tamanho / 2}px`;
    onda.style.top = `${cy - retangulo.top - tamanho / 2}px`;

    alvo.appendChild(onda);
    onda.addEventListener("animationend", () => onda.remove());
  }

  function ativarRipple() {
    document.querySelectorAll(SELETOR_RIPPLE).forEach((el) => {
      if (el.dataset.ecoRippleOk) return;
      el.dataset.ecoRippleOk = "1";
      el.classList.add("eco-ripple-host");
      el.addEventListener("click", (e) => criarOnda(e, el));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ativarRipple);
  } else {
    ativarRipple();
  }
})();

/* ══════════════════════════════════════════════════════════
   3) TILT 3D NOS CARDS
   Só em cards decorativos/informativos (sem formulário, sem
   tabela dentro) — lista curada de propósito, igual ao ripple.
   Desativado em toque (celular/tablet) e reduced-motion.
══════════════════════════════════════════════════════════ */
(function () {
  const SEM_HOVER = window.matchMedia(
    "(hover: none), (pointer: coarse)",
  ).matches;
  if (ECO_REDUZIR_MOVIMENTO || SEM_HOVER) return;

  const SELETOR_TILT = [
    ".card-impacto",
    ".card-beneficio",
    ".step-card",
    ".info-card",
    ".stat-card",
    ".dash-stat-card",
    ".reward-card",
    ".hero-card-visual",
  ].join(", ");

  const GRAUS_MAX = 7;

  function aplicarTilt(el) {
    el.classList.add("eco-tilt");

    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rotY = (px - 0.5) * GRAUS_MAX * 2;
      const rotX = (0.5 - py) * GRAUS_MAX * 2;
      // ── translateY(-4px) preserva o "levantar" que o card já tinha
      // no :hover via CSS — sem isso, o transform inline (que sempre
      // vence o CSS) cancelaria esse efeito enquanto o tilt roda.
      el.style.transform = `perspective(800px) translateY(-4px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  }

  function iniciarTilt() {
    document.querySelectorAll(SELETOR_TILT).forEach((el) => {
      if (el.dataset.ecoTiltOk) return;
      el.dataset.ecoTiltOk = "1";
      aplicarTilt(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarTilt);
  } else {
    iniciarTilt();
  }
})();

/* ══════════════════════════════════════════════════════════
   4) TRANSIÇÃO SUAVE ENTRE TEMA CLARO/ESCURO
   Não mexe na lógica que já troca o tema em cada página — só
   liga uma classe no <html> por ~350ms pra a troca de cor
   acontecer com transição, e desliga sozinha depois. Assim não
   fica uma transição "ligada pra sempre" pesando no site.
══════════════════════════════════════════════════════════ */
(function () {
  if (ECO_REDUZIR_MOVIMENTO) return;

  function iniciarTransicaoTema() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      document.documentElement.classList.add("eco-trocando-tema");
      window.setTimeout(() => {
        document.documentElement.classList.remove("eco-trocando-tema");
      }, 350);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarTransicaoTema);
  } else {
    iniciarTransicaoTema();
  }
})();

/* ══════════════════════════════════════════════════════════
   5) BARRA DE PROGRESSO DE LEITURA
   Uma linha fina fixa no topo, cresce conforme rola a página.
   Em páginas curtas (formulários, telas de login) ela some
   sozinha porque a largura calculada fica perto de 0.
══════════════════════════════════════════════════════════ */
(function () {
  function iniciarBarraProgresso() {
    const barra = document.createElement("div");
    barra.className = "eco-progress-bar";
    barra.setAttribute("aria-hidden", "true");
    document.body.appendChild(barra);

    let pendente = false;
    function atualizar() {
      const alturaRolavel =
        document.documentElement.scrollHeight - window.innerHeight;
      const progresso =
        alturaRolavel > 0 ? (window.scrollY / alturaRolavel) * 100 : 0;
      barra.style.width = `${Math.min(100, Math.max(0, progresso))}%`;
      pendente = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (pendente) return;
        pendente = true;
        window.requestAnimationFrame(atualizar);
      },
      { passive: true },
    );
    window.addEventListener("resize", atualizar);
    atualizar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarBarraProgresso);
  } else {
    iniciarBarraProgresso();
  }
})();

/* ══════════════════════════════════════════════════════════
   6) REVEAL AO ROLAR (compartilhado entre páginas)
   Qualquer elemento com a classe "reveal" aparece suavemente
   quando entra na tela. Antes só existia dentro de index.html;
   agora é genérico e funciona em qualquer página que carregue
   este arquivo — basta adicionar a classe "reveal" no HTML.
══════════════════════════════════════════════════════════ */
(function () {
  function iniciarReveal() {
    const alvos = document.querySelectorAll(".reveal");
    if (!alvos.length) return;

    if (ECO_REDUZIR_MOVIMENTO) {
      alvos.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada, i) => {
          if (!entrada.isIntersecting) return;
          window.setTimeout(
            () => entrada.target.classList.add("visible"),
            i * 80,
          );
          observador.unobserve(entrada.target);
        });
      },
      { threshold: 0.12 },
    );

    alvos.forEach((el) => observador.observe(el));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarReveal);
  } else {
    iniciarReveal();
  }
})();

/* ══════════════════════════════════════════════════════════
   7) CONFETE / CELEBRAÇÃO
   Só dispara quando chamado explicitamente via
   `window.ecoConfete()` — não acontece sozinho em lugar nenhum.
   Usado hoje em: cadastro concluído (cadastro.html e
   cadastro_empresarial.html) e ao subir de nível (perfil.html).
══════════════════════════════════════════════════════════ */
(function () {
  const CORES_CONFETE = ["#5aab5a", "#3d9140", "#f5a623", "#82d182", "#2d7230"];

  window.ecoConfete = function ecoConfete(quantidade) {
    if (ECO_REDUZIR_MOVIMENTO) return;
    quantidade = quantidade || 28;

    const palco = document.createElement("div");
    palco.className = "eco-confete-palco";
    palco.setAttribute("aria-hidden", "true");

    for (let i = 0; i < quantidade; i++) {
      const pedaco = document.createElement("span");
      pedaco.className = "eco-confete-pedaco";
      pedaco.style.left = `${Math.random() * 100}%`;
      pedaco.style.background = CORES_CONFETE[i % CORES_CONFETE.length];
      pedaco.style.animationDelay = `${(Math.random() * 0.25).toFixed(2)}s`;
      pedaco.style.setProperty("--eco-confete-x", `${Math.round((Math.random() - 0.5) * 220)}px`);
      pedaco.style.setProperty("--eco-confete-rot", `${Math.round((Math.random() - 0.5) * 720)}deg`);
      palco.appendChild(pedaco);
    }

    document.body.appendChild(palco);
    window.setTimeout(() => palco.remove(), 1800);
  };
})();
