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
    "perfil_empresa.html": "empresa.html",
    "alterar_senha.html": "perfil.html",
    "consulta_usuarios.html": "index.html",
    "admin_ecopontos.html": "index.html",
    "admin_empresas.html": "index.html",
    "logs.html": "index.html",
    "modelo_bd.html": "index.html",
    "2fa.html": "login.html",
    "codigo.html": "login.html",
    "esqueci_senha.html": "login.html",
    "error_page.html": "index.html",
    "leitor.html": "coleta.html",
  };
  // Conta de empresa: a "casa" é o painel da empresa, não as telas do morador
  const DESTINOS_EMPRESA = {
    "empresa.html": "perfil_empresa.html",
    "perfil_empresa.html": "empresa.html",
    "alterar_senha.html": "perfil_empresa.html",
  };

  // Voltar para estas telas não faz sentido (o login já foi concluído).
  const NAO_VOLTAR_PARA = /(login|2fa|cadastro|cadastro_empresarial|esqueci_senha|error_page)\.html/i;
  // Telas que não são da conta de quem está logado (nunca voltar para elas)
  const SO_PESSOA = /\/(index|coleta|leitor|perfil|consulta_usuarios|admin_ecopontos|admin_empresas|logs|modelo_bd)\.html$|\/$/i; // "/" = página inicial
  const SO_EMPRESA = /\/(empresa|perfil_empresa)\.html$/i;

  let sessao = null;
  try {
    sessao = typeof getSession === "function" ? getSession() : null;
  } catch (_) {}
  const ehEmpresa = !!(sessao && sessao.tipo === "empresa");

  const pagina = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const destino = ehEmpresa
    ? DESTINOS_EMPRESA[pagina] || "empresa.html"
    : DESTINOS[pagina] || "index.html";

  function anteriorValida() {
    try {
      const ref = new URL(document.referrer);
      const telaDeOutraConta = ehEmpresa ? SO_PESSOA.test(ref.pathname) : sessao && SO_EMPRESA.test(ref.pathname);
      return (
        ref.origin === location.origin &&
        ref.pathname !== location.pathname &&
        !NAO_VOLTAR_PARA.test(ref.pathname) &&
        !telaDeOutraConta &&
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
