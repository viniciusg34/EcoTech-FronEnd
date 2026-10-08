"use strict";

/* ══════════════════════════════════════════════════════════
   eco-arte-fundo.js — Arte grande de fundo, temática por
   página. Cada seção com [data-arte-fundo="chave"] recebe o
   SVG correspondente, inserido como primeiro filho (fica atrás
   do conteúdo real da seção, mas dentro do mesmo bloco — assim
   aparece mesmo com o fundo da seção sendo uma cor sólida).
══════════════════════════════════════════════════════════ */

(function () {
  const ECO_ARTES = {
    /* ── Início: horizonte de cidade verde (prédios + árvores),
       agora esticado pra ocupar a tela inteira, de cima a baixo. ── */
    "cidade-verde": `
      <svg viewBox="0 0 1200 1000" preserveAspectRatio="none" aria-hidden="true">
        <rect x="10"  y="420" width="65" height="580" fill="currentColor" opacity="0.35"/>
        <rect x="90"  y="260" width="50" height="740" fill="currentColor" opacity="0.45"/>
        <rect x="155" y="520" width="80" height="480" fill="currentColor" opacity="0.3"/>
        <rect x="340" y="360" width="60" height="640" fill="currentColor" opacity="0.4"/>
        <rect x="410" y="480" width="45" height="520" fill="currentColor" opacity="0.32"/>
        <rect x="620" y="180" width="70" height="820" fill="currentColor" opacity="0.42"/>
        <rect x="700" y="500" width="55" height="500" fill="currentColor" opacity="0.3"/>
        <rect x="900" y="340" width="65" height="660" fill="currentColor" opacity="0.38"/>
        <rect x="975" y="540" width="50" height="460" fill="currentColor" opacity="0.28"/>
        <rect x="1100" y="300" width="60" height="700" fill="currentColor" opacity="0.4"/>

        <g fill="#fff" opacity="0.2">
          <rect x="20" y="460" width="9" height="14"/>
          <rect x="38" y="460" width="9" height="14"/>
          <rect x="20" y="500" width="9" height="14"/>
          <rect x="38" y="500" width="9" height="14"/>
          <rect x="20" y="540" width="9" height="14"/>
          <rect x="38" y="540" width="9" height="14"/>
          <rect x="20" y="580" width="9" height="14"/>
          <rect x="38" y="580" width="9" height="14"/>
          <rect x="100" y="300" width="9" height="14"/>
          <rect x="118" y="300" width="9" height="14"/>
          <rect x="100" y="340" width="9" height="14"/>
          <rect x="118" y="340" width="9" height="14"/>
          <rect x="100" y="380" width="9" height="14"/>
          <rect x="118" y="380" width="9" height="14"/>
          <rect x="630" y="220" width="10" height="16"/>
          <rect x="655" y="220" width="10" height="16"/>
          <rect x="630" y="270" width="10" height="16"/>
          <rect x="655" y="270" width="10" height="16"/>
          <rect x="630" y="320" width="10" height="16"/>
          <rect x="655" y="320" width="10" height="16"/>
        </g>

        <g opacity="0.55">
          <rect x="255" y="820" width="14" height="180" fill="currentColor"/>
          <circle cx="262" cy="770" r="85" fill="currentColor"/>
        </g>
        <g opacity="0.5">
          <rect x="480" y="860" width="12" height="140" fill="currentColor"/>
          <circle cx="486" cy="812" r="70" fill="currentColor"/>
        </g>
        <g opacity="0.6">
          <rect x="790" y="800" width="16" height="200" fill="currentColor"/>
          <circle cx="798" cy="742" r="95" fill="currentColor"/>
        </g>
        <g opacity="0.5">
          <rect x="1040" y="850" width="12" height="150" fill="currentColor"/>
          <circle cx="1046" cy="800" r="75" fill="currentColor"/>
        </g>
        <g opacity="0.45">
          <rect x="1180" y="870" width="11" height="130" fill="currentColor"/>
          <circle cx="1185" cy="825" r="68" fill="currentColor"/>
        </g>
      </svg>`,

    /* ── Sobre nós: árvore grande com raízes visíveis (origem +
       crescimento, combina com "nossa trajetória"). Preenche a
       seção toda (tela cheia), por isso o desenho é bem maior
       e mais robusto que os outros. ── */
    "arvore-raizes": `
      <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d="M400 620 C 320 650 200 635 130 710 M400 620 C 480 650 600 635 670 710
                 M400 620 C 355 665 300 685 230 750 M400 620 C 445 665 500 685 570 750
                 M400 620 L400 760 M400 660 C 370 690 340 700 300 730 M400 660 C 430 690 460 700 500 730"
              stroke="currentColor" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.55"/>
        <rect x="368" y="260" width="64" height="380" rx="16" fill="currentColor" opacity="0.6"/>
        <circle cx="400" cy="200" r="180" fill="currentColor" opacity="0.5"/>
        <circle cx="230" cy="290" r="130" fill="currentColor" opacity="0.42"/>
        <circle cx="570" cy="290" r="130" fill="currentColor" opacity="0.42"/>
        <circle cx="280" cy="110" r="105" fill="currentColor" opacity="0.36"/>
        <circle cx="520" cy="110" r="105" fill="currentColor" opacity="0.36"/>
        <circle cx="400" cy="60" r="90" fill="currentColor" opacity="0.32"/>
      </svg>`,

    /* ── Coleta ecológica: ciclo circular de reaproveitamento ── */
    "ciclo-coleta": `
      <svg viewBox="0 0 1400 420" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <g transform="translate(1080,210)">
          <path d="M0 -170 A170 170 0 1 1 -164 -50" stroke="currentColor" stroke-width="20"
                fill="none" stroke-linecap="round" opacity="0.4"/>
          <path d="M-164 -50 l-27 -36 l46 -8 z" fill="currentColor" opacity="0.4"/>
          <path d="M0 170 A170 170 0 0 1 160 65" stroke="currentColor" stroke-width="20"
                fill="none" stroke-linecap="round" opacity="0.35"/>
          <path d="M160 65 l31 33 l-47 12 z" fill="currentColor" opacity="0.35"/>
          <path d="M160 65 A170 170 0 0 1 0 170" stroke="currentColor" stroke-width="20"
                fill="none" stroke-linecap="round" opacity="0.3"/>
          <path d="M0 -30 C-16 -30 -28 -18 -28 -2 c0 20 28 36 28 36 s28 -16 28 -36 c0 -16 -12 -28 -28 -28z"
                fill="currentColor" opacity="0.5"/>
        </g>
        <g opacity="0.28">
          <rect x="60"  y="300" width="46" height="60" rx="6" fill="currentColor"/>
          <rect x="130" y="270" width="46" height="90" rx="6" fill="currentColor"/>
          <rect x="200" y="315" width="46" height="45" rx="6" fill="currentColor"/>
        </g>
      </svg>`,

    /* ── Perfil: árvore crescendo (liga com o sistema de níveis) ── */
    "arvore-crescendo": `
      <svg viewBox="0 0 1400 400" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <g transform="translate(1180,400)">
          <ellipse cx="0" cy="0" rx="120" ry="14" fill="currentColor" opacity="0.22"/>
          <rect x="-16" y="-190" width="32" height="190" rx="7" fill="currentColor" opacity="0.4"/>
          <path d="M0 -110 C -34 -96 -60 -100 -86 -76 M0 -95 C 30 -82 56 -86 82 -64"
                stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.32"/>
          <circle cx="0" cy="-230" r="90" fill="currentColor" opacity="0.4"/>
          <circle cx="-78" cy="-190" r="58" fill="currentColor" opacity="0.32"/>
          <circle cx="78" cy="-190" r="58" fill="currentColor" opacity="0.32"/>
          <circle cx="-46" cy="-280" r="46" fill="currentColor" opacity="0.28"/>
          <circle cx="46" cy="-280" r="46" fill="currentColor" opacity="0.28"/>
        </g>
        <g opacity="0.22">
          <circle cx="120" cy="360" r="4" fill="currentColor"/>
          <circle cx="180" cy="330" r="5" fill="currentColor"/>
          <circle cx="240" cy="365" r="3.5" fill="currentColor"/>
        </g>
      </svg>`,

    /* ── Empresa: prédio corporativo com trepadeiras verdes
       subindo pela fachada (parceria empresa + sustentabilidade).
       Ancorado à direita/embaixo, deixando o centro (onde fica o
       texto do dash-hero) livre. ── */
    "predio-verde": `
      <svg viewBox="0 0 1400 460" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <rect x="1050" y="200" width="90" height="260" fill="currentColor" opacity="0.26"/>
        <rect x="1170" y="80" width="150" height="380" rx="4" fill="currentColor" opacity="0.4"/>

        <g fill="#fff" opacity="0.22">
          <rect x="1192" y="112" width="14" height="18"/>
          <rect x="1222" y="112" width="14" height="18"/>
          <rect x="1252" y="112" width="14" height="18"/>
          <rect x="1282" y="112" width="14" height="18"/>
          <rect x="1192" y="152" width="14" height="18"/>
          <rect x="1222" y="152" width="14" height="18"/>
          <rect x="1252" y="152" width="14" height="18"/>
          <rect x="1282" y="152" width="14" height="18"/>
          <rect x="1192" y="192" width="14" height="18"/>
          <rect x="1222" y="192" width="14" height="18"/>
          <rect x="1252" y="192" width="14" height="18"/>
          <rect x="1282" y="192" width="14" height="18"/>
          <rect x="1192" y="232" width="14" height="18"/>
          <rect x="1222" y="232" width="14" height="18"/>
          <rect x="1252" y="232" width="14" height="18"/>
          <rect x="1282" y="232" width="14" height="18"/>
          <rect x="1064" y="230" width="12" height="16"/>
          <rect x="1064" y="270" width="12" height="16"/>
          <rect x="1064" y="310" width="12" height="16"/>
        </g>

        <!-- trepadeiras subindo pela lateral do prédio -->
        <path d="M1170 460 C 1150 400 1180 360 1160 300 C 1142 250 1168 210 1150 150"
              stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.42"/>
        <g fill="currentColor" opacity="0.4">
          <circle cx="1157" cy="420" r="11"/>
          <circle cx="1176" cy="380" r="9"/>
          <circle cx="1155" cy="330" r="10"/>
          <circle cx="1170" cy="280" r="8"/>
          <circle cx="1148" cy="230" r="9"/>
          <circle cx="1163" cy="180" r="8"/>
          <circle cx="1150" cy="150" r="10"/>
        </g>

        <path d="M1320 460 C 1338 410 1314 380 1330 330"
              stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.3"/>
        <g fill="currentColor" opacity="0.3">
          <circle cx="1326" cy="430" r="8"/>
          <circle cx="1316" cy="390" r="7"/>
          <circle cx="1330" cy="345" r="7"/>
        </g>

        <g opacity="0.2">
          <circle cx="990" cy="440" r="4" fill="currentColor"/>
          <circle cx="1010" cy="452" r="3" fill="currentColor"/>
        </g>
      </svg>`,

    /* ── Afilie-se: parceria (duas formas se encaixando) + broto
       crescendo do ponto de encontro. Ancorado embaixo/direita,
       na faixa de padding que a seção ganha por ser uma
       .secao-arte-fundo — não disputa espaço com o texto/imagem. ── */
    "parceria-broto": `
      <svg viewBox="0 0 1400 380" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <g transform="translate(1140,300)">
          <path d="M-120 40 C -80 -10 -20 -10 0 30 C -20 -30 -80 -50 -140 -20 Z"
                fill="currentColor" opacity="0.32"/>
          <path d="M120 40 C 80 -10 20 -10 0 30 C 20 -30 80 -50 140 -20 Z"
                fill="currentColor" opacity="0.32"/>
          <rect x="-6" y="-90" width="12" height="70" rx="5" fill="currentColor" opacity="0.4"/>
          <path d="M0 -90 C -30 -95 -46 -78 -46 -58 C -22 -58 -4 -70 0 -90 Z" fill="currentColor" opacity="0.36"/>
          <path d="M0 -90 C 30 -95 46 -78 46 -58 C 22 -58 4 -70 0 -90 Z" fill="currentColor" opacity="0.36"/>
        </g>
        <g opacity="0.2">
          <circle cx="900" cy="360" r="4" fill="currentColor"/>
          <circle cx="950" cy="345" r="5" fill="currentColor"/>
          <circle cx="1010" cy="365" r="3.5" fill="currentColor"/>
        </g>
      </svg>`,

    /* ── Telas administrativas: padrão discreto de circuito + folha,
       concentrado nos cantos (o centro fica livre pra tabela/cards,
       que já têm fundo sólido). Deve ficar quase imperceptível —
       ver opacidade reduzida específica em eco-arte-fundo.css. ── */
    "circuito-folha": `
      <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g stroke="currentColor" stroke-width="4" fill="none" opacity="0.5">
          <path d="M0 60 L90 60 L90 120 L180 120 L180 40"/>
          <path d="M40 0 L40 30"/>
        </g>
        <g fill="currentColor" opacity="0.5">
          <circle cx="90" cy="60" r="6"/>
          <circle cx="180" cy="120" r="6"/>
          <circle cx="40" cy="30" r="5"/>
          <path d="M180 40 C 165 20 168 4 186 0 C 190 18 196 32 180 40 Z"/>
        </g>

        <g stroke="currentColor" stroke-width="4" fill="none" opacity="0.42">
          <path d="M1400 90 L1310 90 L1310 150 L1250 150 L1250 210"/>
        </g>
        <g fill="currentColor" opacity="0.42">
          <circle cx="1310" cy="90" r="6"/>
          <circle cx="1250" cy="150" r="6"/>
          <path d="M1250 210 C 1230 200 1224 182 1238 168 C 1252 180 1262 196 1250 210 Z"/>
        </g>

        <g stroke="currentColor" stroke-width="3.5" fill="none" opacity="0.3">
          <path d="M0 840 L70 840 L70 880"/>
        </g>
        <g fill="currentColor" opacity="0.3">
          <circle cx="70" cy="840" r="5"/>
          <path d="M70 880 C 55 872 52 856 66 850 C 76 862 82 872 70 880 Z"/>
        </g>

        <g stroke="currentColor" stroke-width="3.5" fill="none" opacity="0.3">
          <path d="M1400 860 L1330 860 L1330 900"/>
        </g>
        <g fill="currentColor" opacity="0.3">
          <circle cx="1330" cy="860" r="5"/>
        </g>
      </svg>`,
  };

  function injetarArteFundo() {
    document.querySelectorAll("[data-arte-fundo]").forEach((secao) => {
      if (secao.dataset.arteFundoPronta) return;
      const chave = secao.dataset.arteFundo;
      const svg = ECO_ARTES[chave];
      if (!svg) return;
      secao.dataset.arteFundoPronta = "1";
      const camada = document.createElement("div");
      camada.className = "eco-bg-arte";
      camada.innerHTML = svg;
      secao.insertBefore(camada, secao.firstChild);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injetarArteFundo);
  } else {
    injetarArteFundo();
  }
})();
