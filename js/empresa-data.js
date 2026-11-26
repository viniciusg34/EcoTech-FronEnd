"use strict";

/* ══════════════════════════════════════════════════════════
   empresa-data.js — Painel da empresa.
   Tudo vem de GET /empresas/me/dashboard (totais, série dos
   últimos 6 meses, percentuais por material e a lista de
   ecopontos com status e última atividade). Nada é calculado
   nem inventado aqui; só desenhado.
   Depende de js/config.js e js/api.js.
══════════════════════════════════════════════════════════ */

async function initEmpresaDashboard() {
  const sessao = getSession();

  /* ── Só empresa logada entra ── */
  if (!sessao || sessao.tipo !== "empresa") {
    window.location.href = "login.html";
    return;
  }

  let dash;
  try {
    dash = await EmpresaApi.dashboard();
  } catch (err) {
    console.error("Erro ao carregar o painel da empresa:", err);
    Api.showError(err, "❌ Erro ao carregar dados da empresa.");
    return;
  }
  renderDashboard(dash);
}

function renderDashboard(dash) {
  const esc = Api.escapeHtml;
  const nome = (dash.empresa && dash.empresa.nome) || "";
  const totais = dash.totais || {};
  const serie = dash.serie || { labels: [], valores: [] };
  const categorias = dash.categorias || [];
  const ecopontos = dash.ecopontos || [];

  /* Cabeçalho */
  document.getElementById("dashCompanyBadge").textContent = `🏢 ${nome}`;
  document.getElementById("dashCompanyName").textContent =
    `Painel de Acompanhamento — ${nome}`;

  /* Cartões de totais (textos prontos da API) */
  document.getElementById("statPoints").textContent =
    totais.ecopontos != null ? totais.ecopontos : ecopontos.length;
  document.getElementById("statKg").textContent = totais.kg_formatado || "0";
  document.getElementById("statValidations").textContent =
    totais.validacoes_formatado || "0";
  document.getElementById("statActive").textContent = totais.ativos || 0;
  if (totais.variacao_kg_texto) {
    document.getElementById("statKgDelta").textContent = totais.variacao_kg_texto;
  }

  /* Gráfico de barras (a altura é só escala visual da maior barra) */
  const valores = (serie.valores || []).map(Number);
  const maxVal = Math.max(...valores, 1);
  document.getElementById("chartBars").innerHTML = valores
    .map((val, i) => {
      const h = Math.max((val / maxVal) * 100, 6);
      const rotuloValor =
        (serie.valores_formatados && serie.valores_formatados[i]) != null
          ? serie.valores_formatados[i]
          : val;
      return `
        <div class="dash-chart-col">
          <div class="dash-chart-bar" style="height:${h}%;">
            <span class="dash-chart-bar-value">${esc(rotuloValor)}</span>
          </div>
          <div class="dash-chart-col-label">${esc((serie.labels || [])[i] || "")}</div>
        </div>`;
    })
    .join("");
  document.getElementById("chartTotalLabel").textContent =
    serie.total_formatado || "";

  /* Coleta por material (percentuais já calculados) */
  document.getElementById("breakdownList").innerHTML = categorias
    .map(
      (c) => `
        <div class="dash-breakdown-item">
          <div class="dash-breakdown-row">
            <span class="dash-breakdown-dot" style="background:${esc(c.cor_hex)};"></span>
            <span class="dash-breakdown-label">${esc(c.rotulo)}</span>
            <span class="dash-breakdown-pct">${esc(c.percentual)}%</span>
          </div>
          <div class="dash-breakdown-track">
            <div class="dash-breakdown-fill" style="width:${esc(c.percentual)}%; background:${esc(c.cor_hex)};"></div>
          </div>
        </div>`,
    )
    .join("");

  /* Pontos no formato usado pelo QR e pelo leitor */
  const points = ecopontos.map((p) => ({
    id: p.id,
    code: p.codigo,
    name: p.nome || "Ecoponto",
    address: p.endereco || "Endereço não informado",
    status: p.status,
    statusLabel: p.status_rotulo || p.status,
  }));

  /* Tabela de ecopontos */
  document.getElementById("tableCount").textContent =
    ecopontos.length + (ecopontos.length === 1 ? " Ecoponto" : " Ecopontos");

  document.getElementById("pointsTableBody").innerHTML = ecopontos
    .map((p, i) => {
      const catsHtml = (p.categorias || [])
        .map(
          (c) =>
            `<span class="dash-cat-chip"><span style="background:${esc(c.cor_hex)};"></span>${esc(c.rotulo)}</span>`,
        )
        .join("");
      return `
        <tr>
          <td>
            <span class="dash-point-name">${esc(points[i].name)}</span>
            <span class="dash-point-address">${esc(points[i].address)}</span>
          </td>
          <td><span class="dash-point-code">${esc(p.codigo)}</span></td>
          <td><div class="dash-cats">${catsHtml}</div></td>
          <td><span class="dash-status-pill status-${esc(p.status)}">${esc(points[i].statusLabel)}</span></td>
          <td>${esc(p.kg_mes_formatado || "")}</td>
          <td>${esc(p.ultima_atividade || "—")}</td>
          <td><button class="dash-table-action" data-code="${esc(p.codigo)}" aria-label="Gerar QR do ${esc(p.codigo)}" title="Gerar QR do ${esc(p.codigo)}">…</button></td>
        </tr>`;
    })
    .join("");

  /* Select do gerador de QR */
  const qrSelect = document.getElementById("qrPointSelect");
  qrSelect.innerHTML = `<option value="" disabled selected>Selecione um Ecoponto</option>`;
  points.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.code;
    opt.textContent = `${p.code} — ${p.name}`;
    qrSelect.appendChild(opt);
  });

  /* Expõe `points` para o script inline do empresa.html */
  window.__empresaPoints = points;
  window.__empresaDash = dash; // usado pela exportação do resumo (CSV)
  if (!window.__empresaEventosLigados) {
    // 1ª vez: liga os botões da página (só uma vez, para não duplicar cliques)
    window.__empresaEventosLigados = true;
    if (typeof bindQrListeners === "function") bindQrListeners();
    if (typeof bindReader === "function") bindReader();
    if (typeof bindExport === "function") bindExport();
  } else if (typeof atualizarListasEcopontos === "function") {
    // painel recarregado (ex.: Ecoponto novo): só refaz as listas e os botões da tabela
    atualizarListasEcopontos();
  }
}

/* Recarrega o painel sem abrir a página de novo (ex.: depois de gerar um Ecoponto). */
async function recarregarPainelEmpresa() {
  const dash = await EmpresaApi.dashboard();
  renderDashboard(dash);
  return dash;
}
