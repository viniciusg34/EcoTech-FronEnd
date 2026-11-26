"use strict";

/* ══════════════════════════════════════════════════════════
   eco-map-tiles.js — Camadas de fundo do mapa (Leaflet).
   Usado por index.html e coleta.html. Carregue depois de
   leaflet.js e js/config.js.

     const tiles = EcoMapTiles.criar();   // { light, dark }

   • Com CARTO_KEY em js/config.js: CARTO Voyager (claro) e Dark
     Matter (escuro), com ?key=... — a CARTO passou a exigir chave
     e marca com "API KEY REQUIRED" os tiles pedidos sem ela.
   • Sem chave: OpenStreetMap padrão nos dois temas. Serve para
     desenvolver e para pouco tráfego; para produção, use a chave.
══════════════════════════════════════════════════════════ */
(function (global) {
  var CFG = global.ECOTECH_CONFIG || {};
  var KEY = String(CFG.CARTO_KEY || "").trim();

  var ATTR_CARTO =
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors ' +
    '© <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
  var ATTR_OSM =
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

  function criar() {
    if (KEY) {
      var q = "?key=" + encodeURIComponent(KEY);
      return {
        light: L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" + q,
          { attribution: ATTR_CARTO, maxZoom: 20 },
        ),
        dark: L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" + q,
          { attribution: ATTR_CARTO, maxZoom: 20 },
        ),
      };
    }

    console.warn(
      "[mapa] CARTO_KEY vazia em js/config.js: usando OpenStreetMap. " +
        "Peça a chave gratuita em https://carto.com/basemaps/apikey.",
    );
    var osm = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    return {
      light: L.tileLayer(osm, { attribution: ATTR_OSM, maxZoom: 19 }),
      dark: L.tileLayer(osm, { attribution: ATTR_OSM, maxZoom: 19 }),
    };
  }

  global.EcoMapTiles = { criar: criar };
})(window);
