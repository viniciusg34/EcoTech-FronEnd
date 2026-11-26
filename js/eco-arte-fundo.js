"use strict";

/* ══════════════════════════════════════════════════════════
   eco-arte-fundo.js — Arte grande de fundo, temática por
   página. Cada seção com [data-arte-fundo="chave"] recebe uma
   camada <div class="eco-bg-arte eco-bg-arte--chave"> como
   primeiro filho (fica atrás do conteúdo real da seção, mas
   dentro do mesmo bloco).

   As imagens são PNGs em assets/arte/ e quem escolhe qual
   imagem vai em cada chave é o css/eco-arte-fundo.css — aqui
   não tem mais nenhum desenho feito por código.

   Chaves usadas hoje:
     cidade-verde      → index.html (topo)
     arvore-raizes     → sobre_nos.html
     ciclo-coleta      → coleta.html (cabeçalho do mapa)
     arvore-crescendo  → perfil.html e perfil_empresa.html
     predio-verde      → empresa.html
     parceria-broto    → afilie_se.html
     circuito-folha    → telas administrativas (hoje usa o ícone do ciclo)
     seguranca         → esqueci_senha.html, 2fa.html, alterar_senha.html
                         (hoje usa as mãos com broto do afilie-se)
     caminho           → error_page.html e 404 (hoje usa a cidade verde)
     cidade-verde também aparece no leitor.html (a mesma imagem, já em cache)
══════════════════════════════════════════════════════════ */

(function () {
  function injetarArteFundo() {
    document.querySelectorAll("[data-arte-fundo]").forEach((secao) => {
      if (secao.dataset.arteFundoPronta) return;
      const chave = secao.dataset.arteFundo;
      if (!/^[a-z0-9-]+$/.test(chave || "")) return;
      secao.dataset.arteFundoPronta = "1";
      const camada = document.createElement("div");
      camada.className = "eco-bg-arte eco-bg-arte--" + chave;
      camada.setAttribute("aria-hidden", "true");
      secao.insertBefore(camada, secao.firstChild);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injetarArteFundo);
  } else {
    injetarArteFundo();
  }
})();
