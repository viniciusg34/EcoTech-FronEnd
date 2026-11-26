"use strict";

/* ══════════════════════════════════════════════════════════
   eco-admin.js — Perfil master.
   Para quem está logado como master:
     • cria a aba "Admin ▾" no header (menu com as telas do master);
     • na página de perfil, cria o cartão "Administração".
   Para os outros usuários não aparece nada. Quem autoriza de
   verdade é a API (rotas /admin só aceitam o master).
══════════════════════════════════════════════════════════ */

function isMaster(session) {
  return !!(session && session.perfil === "master");
}

/* Telas do master (mude aqui para aparecer no header e no perfil) */
var ECO_ADMIN_LINKS = [
  { href: "admin_ecopontos.html", icone: "♻️", texto: "Ecopontos" },
  { href: "admin_empresas.html", icone: "🏢", texto: "Empresas" },
  { href: "consulta_usuarios.html", icone: "🔎", texto: "Consulta de Usuários" },
  { href: "logs.html", icone: "🧾", texto: "Log de Autenticação" },
  { href: "modelo_bd.html", icone: "🗄️", texto: "Modelo do BD" },
];

function ecoAdminEstilos() {
  if (document.getElementById("eco-admin-css")) return;
  var css = document.createElement("style");
  css.id = "eco-admin-css";
  css.textContent =
    ".eco-admin-tab{position:relative;display:inline-flex;align-items:center;}" +
    ".eco-admin-tab > button{background:none;border:0;cursor:pointer;font:inherit;font-size:0.9rem;font-weight:700;" +
    "color:var(--sage-600,#3E5A3F);display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;white-space:nowrap;}" +
    ".eco-admin-tab > button:hover,.eco-admin-tab.aberto > button{background:var(--sage-50,#EDF0E8);}" +
    ".eco-admin-menu{display:none;position:absolute;top:calc(100% + 8px);right:0;min-width:230px;z-index:9999;" +
    "background:var(--white,#fff);border:1.5px solid var(--sage-100,#D9C7A3);border-radius:16px;" +
    "box-shadow:0 12px 40px rgba(0,0,0,0.15);padding:8px;}" +
    ".eco-admin-tab.aberto .eco-admin-menu{display:block;}" +
    ".eco-admin-menu a{display:flex !important;gap:10px;align-items:center;padding:9px 10px !important;border-radius:10px;" +
    "text-decoration:none;color:var(--ink,#1a2e1b) !important;font-size:0.86rem;font-weight:600;}" +
    ".eco-admin-menu a::after{display:none !important;}" +
    ".eco-admin-menu a:hover,.eco-admin-menu a.atual{background:var(--sage-50,#EDF0E8);}" +
    ".eco-admin-titulo{padding:6px 10px;font-size:0.7rem;font-weight:800;color:var(--ink-3,#6b8f6c);" +
    "text-transform:uppercase;letter-spacing:.04em;}" +
    /* celular: dentro do menu ☰ a lista aparece aberta, sem flutuar */
    "@media (max-width:840px){#main-nav .eco-admin-tab{display:block;}" +
    "#main-nav .eco-admin-tab > button{width:100%;padding:10px 14px;}" +
    "#main-nav .eco-admin-menu{position:static;box-shadow:none;border:0;padding:0 0 0 12px;min-width:0;background:transparent;}}";
  document.head.appendChild(css);
}

function ecoAdminLinksHtml() {
  var atual = (location.pathname.split("/").pop() || "").toLowerCase();
  return ECO_ADMIN_LINKS.map(function (l) {
    return (
      '<a href="' + l.href + '"' + (l.href === atual ? ' class="atual" aria-current="page"' : "") + ">" +
      "<span>" + l.icone + "</span>" + l.texto + "</a>"
    );
  }).join("");
}

/* Aba "Admin ▾" no header */
function injetarAbaAdmin() {
  if (document.getElementById("eco-admin-tab")) return;

  var nav = document.getElementById("main-nav");               // header das páginas do site
  var acoes = document.querySelector(".admin-header .header-actions"); // header das telas admin
  if (!nav && !acoes) return;

  var aba = document.createElement("div");
  aba.id = "eco-admin-tab";
  aba.className = "eco-admin-tab";
  aba.innerHTML =
    '<button type="button" aria-haspopup="true" aria-expanded="false">🛡️ Admin <span aria-hidden="true">▾</span></button>' +
    '<div class="eco-admin-menu" role="menu"><div class="eco-admin-titulo">Perfil master</div>' +
    ecoAdminLinksHtml() + "</div>";

  if (nav) {
    var afilie = nav.querySelector(".btn-nav");
    nav.insertBefore(aba, afilie || null); // antes do "Afilie-se"
  } else {
    acoes.insertBefore(aba, acoes.firstChild);
  }

  var botao = aba.querySelector("button");
  botao.addEventListener("click", function (e) {
    e.stopPropagation();
    var aberto = aba.classList.toggle("aberto");
    botao.setAttribute("aria-expanded", aberto ? "true" : "false");
  });
  document.addEventListener("click", function (e) {
    if (!aba.contains(e.target)) {
      aba.classList.remove("aberto");
      botao.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") aba.classList.remove("aberto");
  });
}

/* Cartão "Administração" na página de perfil */
function injetarCartaoPerfil() {
  var pagina = document.querySelector(".profile-page");
  if (!pagina || document.getElementById("eco-admin-card")) return;

  var cartao = document.createElement("div");
  cartao.id = "eco-admin-card";
  cartao.className = "section-card";
  cartao.innerHTML =
    "<h3>🛡️ Administração (master)</h3>" +
    ECO_ADMIN_LINKS.map(function (l, i) {
      return (
        '<div class="menu-row" role="button" tabindex="0" data-href="' + l.href + '"' +
        (i ? ' style="margin-top:8px"' : "") + ">" +
        '<div class="menu-row-left"><span>' + l.icone + "</span>" + l.texto + "</div>" +
        '<span class="menu-arrow">›</span></div>'
      );
    }).join("");

  cartao.querySelectorAll("[data-href]").forEach(function (linha) {
    function ir() { window.location.href = linha.getAttribute("data-href"); }
    linha.addEventListener("click", ir);
    linha.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); }
    });
  });

  // logo depois do cabeçalho do perfil (antes de "Configurações da Conta")
  var cabecalho = pagina.querySelector(".profile-header");
  pagina.insertBefore(cartao, cabecalho ? cabecalho.nextSibling : pagina.firstChild);
}

function iniciarEcoAdmin() {
  if (typeof getSession !== "function") return; // api.js não incluído nesta página
  if (!isMaster(getSession())) return;
  ecoAdminEstilos();
  injetarAbaAdmin();
  injetarCartaoPerfil();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarEcoAdmin);
} else {
  iniciarEcoAdmin();
}
