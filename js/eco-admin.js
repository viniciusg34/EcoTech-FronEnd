"use strict";

/* eco-admin.js — Atalho "Painel Admin", só para o perfil master.
   Quem bloqueia de verdade as telas é a API. */
/* ══════════════════════════════════════════════════════════
   Atalho flutuante "Painel Admin" — some função ao carregar,
   e só aparece para quem está logado com perfil master.
   Não altera nenhum header já existente: apenas injeta um
   botão fixo novo no canto da tela.
══════════════════════════════════════════════════════════ */
async function injectAdminShortcut() {
  const { usuario } = await obterSessao();
  if (!usuario || usuario.perfil !== "master") return;
  if (document.getElementById("eco-admin-shortcut")) return;

  const wrap = document.createElement("div");
  wrap.id = "eco-admin-shortcut";
  wrap.style.cssText =
    "position:fixed;left:18px;bottom:18px;z-index:9998;font-family:'Plus Jakarta Sans','Poppins',sans-serif;";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = "Painel Admin";
  btn.setAttribute("aria-label", "Abrir painel administrativo");
  btn.style.cssText =
    "width:50px;height:50px;border-radius:50%;border:2px solid var(--sage-400,#8CA98C);" +
    "background:var(--sage-500,#3E5A3F);color:#fff;font-size:20px;cursor:pointer;" +
    "box-shadow:0 8px 24px rgba(31, 42, 31,0.28);display:grid;place-items:center;";
  btn.textContent = "🛡️";

  const menu = document.createElement("div");
  menu.style.cssText =
    "display:none;position:absolute;left:0;bottom:60px;background:var(--white,#fff);" +
    "border:1.5px solid var(--sage-100,#D9C7A3);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.15);" +
    "padding:8px;min-width:210px;";
  menu.innerHTML =
    '<div style="padding:8px 10px;font-size:0.72rem;font-weight:700;color:var(--ink-3,#526E53);text-transform:uppercase;letter-spacing:.03em;">Perfil Master</div>' +
    '<a href="consulta_usuarios.html" style="display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:10px;text-decoration:none;color:var(--ink,#1F2A1F);font-size:0.85rem;font-weight:600;">🔎 Consulta de Usuários</a>' +
    '<a href="logs.html" style="display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:10px;text-decoration:none;color:var(--ink,#1F2A1F);font-size:0.85rem;font-weight:600;">🧾 Log de Autenticação</a>' +
    '<a href="modelo_bd.html" style="display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:10px;text-decoration:none;color:var(--ink,#1F2A1F);font-size:0.85rem;font-weight:600;">🗄️ Modelo do BD</a>';

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("mouseenter", () => (a.style.background = "var(--sage-50,#EDF0E8)"));
    a.addEventListener("mouseleave", () => (a.style.background = "transparent"));
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", () => (menu.style.display = "none"));

  wrap.appendChild(menu);
  wrap.appendChild(btn);
  document.body.appendChild(wrap);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectAdminShortcut);
} else {
  injectAdminShortcut();
}
