"use strict";

/* ══════════════════════════════════════════════════════════
   eco-voltar.js — Seta de voltar, igual à do login, em todas as telas.
   Volta para a página anterior do site. Se não houver uma (link
   aberto direto, ou a anterior era login/2FA/cadastro), vai para o
   destino fixo da tela, definido em DESTINOS.
══════════════════════════════════════════════════════════ */
(function () {
  const DESTINOS = {
    "index.html": "sobre_nos.html",
    "sobre_nos.html": "index.html",
    "afilie_se.html": "sobre_nos.html",
    "coleta.html": "index.html",
    "empresa.html": "index.html",
    "perfil.html": "index.html",
    "alterar_senha.html": "perfil.html",
    "consulta_usuarios.html": "index.html",
    "logs.html": "index.html",
    "modelo_bd.html": "index.html",
    "2fa.html": "login.html",
    "esqueci_senha.html": "login.html",
    "error_page.html": "index.html",
  };
  // Voltar para estas telas não faz sentido (o login já foi concluído).
  const NAO_VOLTAR_PARA = /(login|2fa|cadastro|cadastro_empresarial|esqueci_senha|error_page)\.html/i;

  const pagina = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const destino = DESTINOS[pagina] || "index.html";

  function anteriorValida() {
    try {
      const ref = new URL(document.referrer);
      return (
        ref.origin === location.origin &&
        ref.pathname !== location.pathname &&
        !NAO_VOLTAR_PARA.test(ref.pathname) &&
        history.length > 1
      );
    } catch (_) {
      return false;
    }
  }

  function criarSeta() {
    if (document.querySelector(".btn-back, .btn-back-float, .eco-voltar")) return;

    const seta = document.createElement("a");
    seta.className = "eco-voltar";
    seta.href = destino;
    seta.setAttribute("aria-label", "Voltar");
    seta.title = "Voltar";
    seta.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
    seta.addEventListener("click", (e) => {
      if (anteriorValida()) {
        e.preventDefault();
        history.back();
      }
    });

    const cabecalho = document.querySelector(".nav-container, .admin-header");
    if (cabecalho) {
      cabecalho.prepend(seta);
    } else {
      seta.classList.add("eco-voltar--fixa");
      document.body.prepend(seta);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", criarSeta);
  } else {
    criarSeta();
  }
})();
