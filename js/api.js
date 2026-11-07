"use strict";

/* ══════════════════════════════════════════════════════════
   api.js — Ligação do front com a API Laravel do EcoTech.
   Regras (documento "EcoTech API — rotas e prompt de integração"):
   1. O endereço da API fica só na constante abaixo. Ao publicar a
      API, troque apenas ela.
   2. Todo fetch usa credentials: "include" (o login é um cookie).
   3. O corpo vai em JSON.
   4. A resposta é { sucesso, dados } ou { sucesso: false, erro, ... }.
   Quem diz quem está logado é sempre o GET /sessao: perfil e senha
   não ficam guardados no navegador.
══════════════════════════════════════════════════════════ */
const API = "http://127.0.0.1:8000/api";

const ECO_PERFIS = ["master", "comum", "empresa"];

/* Chaves da versão antiga (MockAPI), que guardavam sessão e senhas. */
[
  "ecotech_session",
  "ecotech_pending_2fa",
  "ecotech_user_id",
  "ecotech_master_users",
  "ecotech_local_users",
  "usuariosEcoTech",
  "empresasEcoTech",
  "sessaoEcoTech",
].forEach((chave) => {
  try {
    localStorage.removeItem(chave);
    sessionStorage.removeItem(chave);
  } catch (_) {}
});

/* ── Chamada padrão: nunca lança erro, sempre devolve o objeto. ── */
async function api(caminho, { metodo = "GET", corpo } = {}) {
  try {
    const resposta = await fetch(API + caminho, {
      method: metodo,
      credentials: "include",
      headers: corpo
        ? { "Content-Type": "application/json", Accept: "application/json" }
        : { Accept: "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const json = await resposta.json().catch(() => null);
    if (!json) {
      return {
        sucesso: false,
        erro: "Resposta inválida do servidor",
        status: resposta.status,
      };
    }
    return { ...json, status: resposta.status };
  } catch (_) {
    return {
      sucesso: false,
      erro: "Não foi possível conectar ao servidor",
      semConexao: true,
    };
  }
}

/* ══════════════════════════════════════════════════════════
   CONTAS DE TESTE (só quando a API está fora do ar)
   Permitem avaliar o visual sem o back-end rodando. Não dão acesso
   a nenhum dado real. Apagar antes de publicar para usuários reais.
══════════════════════════════════════════════════════════ */
const CONTAS_TESTE = [
  { id: "teste-local", nome: "Usuário Teste", login: "teste", email: "teste@ecotech.com", senha: "Teste123", perfil: "comum" },
  { id: "empresa-local", nome: "Empresa Teste", login: "empresa", email: "empresa@ecotech.com", senha: "Teste123", perfil: "empresa" },
];
const ECO_CHAVE_TESTE = "ecotech_teste";

function entrarComContaTeste(login, senha) {
  const conta = CONTAS_TESTE.find(
    (c) => c.email === login.toLowerCase() && c.senha === senha.trim(),
  );
  if (!conta) return null;
  const { senha: _ignorada, ...usuario } = conta;
  usuario.demo = true;
  sessionStorage.setItem(ECO_CHAVE_TESTE, JSON.stringify(usuario));
  return usuario;
}

function lerContaTeste() {
  try {
    return JSON.parse(sessionStorage.getItem(ECO_CHAVE_TESTE));
  } catch (_) {
    return null;
  }
}

/* ══════════════════════════════════════════════════════════
   SESSÃO
══════════════════════════════════════════════════════════ */
let ecoSessaoPromessa = null;
let ecoUsuarioAtual = null;

/* Devolve { usuario, semConexao, erroServidor }. Só consulta uma vez
   por página. */
function obterSessao() {
  if (!ecoSessaoPromessa) {
    ecoSessaoPromessa = api("/sessao").then((r) => {
      if (r.sucesso) {
        if (!r.dados || !r.dados.logado) sessionStorage.removeItem(ECO_CHAVE_TESTE);
        ecoUsuarioAtual = r.dados && r.dados.logado ? r.dados.usuario : null;
        return { usuario: ecoUsuarioAtual };
      }
      if (r.semConexao) {
        ecoUsuarioAtual = lerContaTeste();
        return { usuario: ecoUsuarioAtual, semConexao: true };
      }
      return { usuario: null, erroServidor: r.erro || "Erro no servidor" };
    });
  }
  return ecoSessaoPromessa;
}

function irParaErro(texto) {
  window.location.replace(
    "error_page.html?erro=" + encodeURIComponent(texto || "Erro inesperado"),
  );
}

/* Protege a tela: sem login vai para o login; perfil sem permissão
   vai para a principal. Devolve o usuário logado. */
async function protegerTela(perfisPermitidos = ECO_PERFIS) {
  const raiz = document.documentElement;
  raiz.style.visibility = "hidden";
  const parar = new Promise(() => {});

  const sessao = await obterSessao();
  if (sessao.erroServidor) {
    irParaErro(sessao.erroServidor);
    return parar;
  }
  if (!sessao.usuario) {
    window.location.replace("login.html");
    return parar;
  }
  if (!perfisPermitidos.includes(sessao.usuario.perfil)) {
    window.location.replace("index.html");
    return parar;
  }
  raiz.style.visibility = "";
  return sessao.usuario;
}

/* O botão Voltar do navegador não pode reabrir tela protegida depois
   de sair: quando a página volta do cache, confere a sessão de novo. */
window.addEventListener("pageshow", (evento) => {
  if (evento.persisted) window.location.reload();
});

async function sair() {
  await api("/logout", { metodo: "POST" });
  sessionStorage.removeItem(ECO_CHAVE_TESTE);
  window.location.replace("login.html");
}

/* ══════════════════════════════════════════════════════════
   MENSAGENS
══════════════════════════════════════════════════════════ */
function mostrarMensagem(texto, tipo = "erro") {
  if (typeof showToast === "function" && document.getElementById("toast")) {
    showToast(texto, tipo === "sucesso");
    return;
  }
  let caixa = document.getElementById("eco-mensagem");
  if (!caixa) {
    caixa = document.createElement("div");
    caixa.id = "eco-mensagem";
    caixa.setAttribute("role", "status");
    caixa.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:10002;" +
      "padding:12px 22px;border-radius:99px;background:#1F2A1F;color:#FAF6EC;" +
      "font-weight:600;font-size:.9rem;box-shadow:0 8px 32px rgba(0,0,0,.25);" +
      "max-width:calc(100vw - 32px);text-align:center;";
    document.body.appendChild(caixa);
  }
  caixa.textContent = texto;
  caixa.style.display = "block";
  clearTimeout(caixa._timer);
  caixa._timer = setTimeout(() => (caixa.style.display = "none"), 3200);
}

function limparErrosCampos() {
  document.querySelectorAll(".eco-erro-campo").forEach((el) => el.remove());
}

/* Escreve cada erro embaixo do input com o mesmo name ou id. */
function mostrarErrosCampos(campos) {
  limparErrosCampos();
  Object.entries(campos || {}).forEach(([nome, texto]) => {
    const input =
      document.querySelector(`[name="${nome}"]`) || document.getElementById(nome);
    if (!input) {
      mostrarMensagem(String(texto));
      return;
    }
    const aviso = document.createElement("small");
    aviso.className = "eco-erro-campo";
    aviso.textContent = Array.isArray(texto) ? texto[0] : texto;
    (input.closest(".input-box") || input).insertAdjacentElement("afterend", aviso);
  });
}

/* Trata os códigos HTTP combinados com o back-end. */
function tratarFalha(resposta) {
  if (resposta.status >= 500) {
    irParaErro(resposta.erro);
    return;
  }
  mostrarMensagem(resposta.erro || "Algo deu errado. Tente novamente.");
  if (resposta.voltar_login || resposta.status === 401) {
    setTimeout(() => window.location.replace("login.html"), 2000);
  } else if (resposta.status === 403) {
    setTimeout(() => window.location.replace("index.html"), 2000);
  }
  if (resposta.campos) mostrarErrosCampos(resposta.campos);
}

/* Texto vindo da API nunca entra cru no HTML. */
function escaparHtml(valor) {
  const div = document.createElement("div");
  div.textContent = valor == null ? "" : String(valor);
  return div.innerHTML;
}

/* ══════════════════════════════════════════════════════════
   EcoCoins e histórico
   A API só tem rota para GRAVAR as moedas (PUT /usuarios/coins).
   Sem rota de leitura, saldo e histórico ficam neste navegador,
   separados por conta. Se /sessao passar a mandar "coins", vale o
   valor do servidor.
══════════════════════════════════════════════════════════ */
function ecoDados(id) {
  try {
    return {
      coins: 0,
      reciclado: [],
      ...JSON.parse(localStorage.getItem("ecotech_dados_" + id)),
    };
  } catch (_) {
    return { coins: 0, reciclado: [] };
  }
}

function ecoSalvarDados(id, mudancas) {
  localStorage.setItem(
    "ecotech_dados_" + id,
    JSON.stringify({ ...ecoDados(id), ...mudancas }),
  );
}

async function ecoEnviarCoins(usuario, coins) {
  if (usuario.demo || usuario.perfil === "empresa") return;
  const corpo = { coins };
  if (usuario.perfil === "master") corpo.user_id = usuario.id;
  const r = await api("/usuarios/coins", { metodo: "PUT", corpo });
  if (!r.sucesso) console.warn("Moedas não enviadas à API:", r.erro);
}

/* ── Ecopontos: lista e situação ── */
async function ecoListarEcopontos(empresaId) {
  const r = await api(
    "/ecopontos" + (empresaId ? "?empresa=" + encodeURIComponent(empresaId) : ""),
  );
  return r.sucesso && Array.isArray(r.dados) ? r.dados : null;
}

function ecoId(item, campo) {
  return item[campo] != null ? item[campo] : item.id;
}

function ecoAtivo(status) {
  if (typeof status === "string") return !/^(0|false|inativo)$/i.test(status.trim());
  return !!status;
}
