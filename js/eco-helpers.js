"use strict";

/* ══════════════════════════════════════════════════════════
   eco-helpers.js — Funções utilitárias compartilhadas
   (validação, máscara, autocompletar CEP).

   Algumas destas funções já eram CHAMADAS em cadastro.html e
   login.html (cleanText, validarCPF, calcularIdade, senhaSegura,
   togglePassword, autenticarLocal) mas nunca tinham sido
   definidas em nenhum arquivo do projeto — os formulários
   quebravam ao serem enviados. Este arquivo apenas ADICIONA
   essas implementações; nenhum HTML/JS existente foi alterado
   em sua lógica.
══════════════════════════════════════════════════════════ */

/* ── Texto ── */
function cleanText(str) {
  return (str || "").trim().replace(/\s+/g, " ");
}

/* ── CPF (dígito verificador) ── */
function validarCPF(cpf) {
  cpf = (cpf || "").replace(/[^\d]/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10], 10);
}

function formatarCPF(cpf) {
  cpf = (cpf || "").replace(/[^\d]/g, "").slice(0, 11);
  return cpf
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/* ── Idade a partir da data de nascimento ── */
function calcularIdade(dataStr) {
  if (!dataStr) return 0;
  const nascimento = new Date(dataStr + "T00:00:00");
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

/* ── Força de senha (8+ caracteres, maiúscula, minúscula e número) ── */
function senhaSegura(senha) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(senha || "");
}

/* ── Login: exatamente 6 caracteres alfabéticos (item 6 do PDF) ── */
function validarLoginField(login) {
  return /^[A-Za-zÀ-ÿ]{6}$/.test((login || "").trim());
}

/* ── Telefone: máscara "(DD) NNNNN-NNNN" (celular, 9 dígitos no
   número) ou "(DD) NNNN-NNNN" (fixo, 8 dígitos). Nada é fixo ou
   pré-definido: o DDD e o número inteiros são digitados pela
   própria pessoa — a máscara só adiciona o parêntese, o espaço e
   o hífen para organizar visualmente enquanto ela digita. */
function criarFormatadorTelefone(digitosDoNumero) {
  return function (valor) {
    const digitos = (valor || "").replace(/[^\d]/g, "").slice(0, 2 + digitosDoNumero);
    if (digitos.length === 0) return "";

    const ddd = digitos.slice(0, 2);
    if (digitos.length <= 2) return "(" + ddd;

    const numero = digitos.slice(2);
    const meio = digitosDoNumero === 9 ? 5 : 4; // onde entra o hífen
    const numeroFormatado =
      numero.length <= meio ? numero : numero.slice(0, meio) + "-" + numero.slice(meio);
    return "(" + ddd + ") " + numeroFormatado;
  };
}

const formatarTelefoneCelular = criarFormatadorTelefone(9);
const formatarTelefoneFixo = criarFormatadorTelefone(8);

function telefoneValido(valor, digitosDoNumero) {
  const re =
    digitosDoNumero === 9
      ? /^\(\d{2}\) \d{5}-\d{4}$/
      : /^\(\d{2}\) \d{4}-\d{4}$/;
  return re.test((valor || "").trim());
}

/* ── Aplica uma máscara a um <input> preservando a posição do
   cursor (senão, toda vez que o valor é reescrito via JS, o
   cursor pula pro final e fica impossível editar/apagar no meio
   do texto, ou apagar de forma previsível). ── */
function aplicarMascaraComCursor(input, maskFn) {
  input.addEventListener("input", () => {
    const posAntes = input.selectionStart || 0;
    const digitosAntesDoCursor = input.value
      .slice(0, posAntes)
      .replace(/[^\d]/g, "").length;

    const formatado = maskFn(input.value);
    input.value = formatado;

    // Recoloca o cursor logo após o mesmo número de dígitos que
    // havia antes do cursor original, agora dentro do texto já
    // formatado (compensa os caracteres de máscara adicionados).
    let pos = 0;
    let digitosVistos = 0;
    while (pos < formatado.length && digitosVistos < digitosAntesDoCursor) {
      if (/\d/.test(formatado[pos])) digitosVistos++;
      pos++;
    }
    input.setSelectionRange(pos, pos);
  });
}

/* ── CEP: máscara + preenchimento automático via ViaCEP ── */
function formatarCEP(valor) {
  const d = (valor || "").replace(/[^\d]/g, "").slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
}

/* ── Data (dd/mm/aaaa) — usada tanto no cadastro quanto na
   pergunta de "data de nascimento" do 2FA. ── */
function formatarDataBR(valor) {
  const d = (valor || "").replace(/[^\d]/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
  return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
}

async function buscarEnderecoPorCEP(cepInput, campos) {
  const cep = (cepInput || "").replace(/[^\d]/g, "");
  if (cep.length !== 8) return { ok: false, motivo: "CEP incompleto." };
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!resp.ok) throw new Error("Falha na consulta.");
    const dados = await resp.json();
    if (dados.erro) return { ok: false, motivo: "CEP não encontrado." };
    if (campos) {
      if (campos.logradouro) campos.logradouro.value = dados.logradouro || "";
      if (campos.bairro) campos.bairro.value = dados.bairro || "";
      if (campos.cidade) campos.cidade.value = dados.localidade || "";
      if (campos.uf) campos.uf.value = dados.uf || "";
    }
    return { ok: true, dados };
  } catch (err) {
    return { ok: false, motivo: "Sem conexão — preencha o endereço manualmente." };
  }
}

/* ── Mostrar/ocultar senha (usa o id do input, ou detecta o
   input irmão quando chamado sem argumento, como em login.html) ── */
function togglePassword(id) {
  let input = id ? document.getElementById(id) : null;
  if (!input && typeof event !== "undefined" && event && event.target) {
    const box = event.target.closest(".input-box");
    if (box) input = box.querySelector("input");
  }
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
}

/* ══════════════════════════════════════════════════════════
   USUÁRIOS LOCAIS (localStorage) — funciona mesmo sem o
   back-end/banco de dados de verdade, que é responsabilidade
   de outra parte do projeto. O cadastro, login e perfil usam
   isso como um "banco de dados" local sempre que a API não
   está disponível, então a pessoa consegue criar e editar o
   perfil dela normalmente de qualquer jeito.
══════════════════════════════════════════════════════════ */
const CHAVE_USUARIOS_LOCAIS = "ecotech_local_users";

function listarUsuariosLocais() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_USUARIOS_LOCAIS) || "[]");
  } catch (_) {
    return [];
  }
}

function salvarListaUsuariosLocais(lista) {
  localStorage.setItem(CHAVE_USUARIOS_LOCAIS, JSON.stringify(lista));
}

function buscarUsuarioLocalPorEmail(email) {
  const alvo = (email || "").trim().toLowerCase();
  return (
    listarUsuariosLocais().find((u) => (u.email || "").toLowerCase() === alvo) ||
    null
  );
}

function buscarUsuarioLocalPorId(id) {
  return listarUsuariosLocais().find((u) => String(u.id) === String(id)) || null;
}

/* Cria (ou substitui, se o e-mail já existir) um usuário local.
   Retorna o registro salvo, já com um id local gerado. */
function criarUsuarioLocal(dados) {
  const lista = listarUsuariosLocais();
  const id = "local-" + Date.now();
  const usuario = { id, perfil: "comum", coins: 0, avatar: "", reciclado: [], ...dados };
  lista.push(usuario);
  salvarListaUsuariosLocais(lista);
  return usuario;
}

/* Atualiza campos de um usuário local existente (usado pelo
   perfil.html ao salvar edições). */
function atualizarUsuarioLocal(id, mudancas) {
  const lista = listarUsuariosLocais();
  const indice = lista.findIndex((u) => String(u.id) === String(id));
  if (indice === -1) return null;
  lista[indice] = { ...lista[indice], ...mudancas };
  salvarListaUsuariosLocais(lista);
  return lista[indice];
}

/* Remove um usuário local (usado ao excluir a conta pelo perfil.html). */
function removerUsuarioLocal(id) {
  salvarListaUsuariosLocais(
    listarUsuariosLocais().filter((u) => String(u.id) !== String(id)),
  );
}

/* ── Login local: usado como último recurso em login.html
   quando a API de pessoas não responde ou não encontra a conta. ── */
function autenticarLocal(email, senha) {
  const usuario = buscarUsuarioLocalPorEmail(email);
  if (usuario && usuario.senha === senha) return usuario;
  return null;
}
