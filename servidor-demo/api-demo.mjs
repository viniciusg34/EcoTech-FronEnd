// Servidor de DEMONSTRAÇÃO da API EcoTech (dados simulados, em memória).
// Fala o mesmo contrato do backend real (docs/BACKEND-ajustes-vindos-do-front.md),
// mas NÃO é o backend do projeto: serve só para ensaiar e para ser o "plano B"
// quando a rede ou o banco falham. Toda resposta leva o cabeçalho
// X-EcoTech-Modo: demo e /saude informa modo "demo" (o front mostra um selo amarelo).
import http from "node:http";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { criarBanco, hashSenha, sha, cpfValido, cnpjValido, eanValido, senhaForte, normalizar } from "./dados.mjs";

const qrcode = createRequire(import.meta.url)("./vendor/qrcode.cjs");
const TZ = "America/Sao_Paulo";
const MIN = 60000;
const HORA = 3600000;

export function criarApi({ agora = () => Date.now(), senhaMaster = process.env.DEMO_MASTER_PASSWORD || "Master123", cooldownMin } = {}) {
  const db = criarBanco({ agora, senhaMaster });
  if (cooldownMin != null) db.config.checkin_cooldown_min = cooldownMin;
  else if (process.env.DEMO_CHECKIN_COOLDOWN_MIN) db.config.checkin_cooldown_min = Number(process.env.DEMO_CHECKIN_COOLDOWN_MIN);
  const QR_SECRET = crypto.randomBytes(16).toString("hex");

  /* ── formatação (a API entrega tudo pronto) ── */
  const fmt = (n) => Number(n).toLocaleString("pt-BR");
  const fmtKg = (kg) => `${Number(kg).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  const partes = (ms) => Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(ms).map((p) => [p.type, p.value]));
  const dataFmt = (ms) => { const p = partes(ms); return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`; };
  const diaChave = (ms) => { const p = partes(ms); return `${p.year}-${p.month}-${p.day}`; };
  const mesChave = (ms) => diaChave(ms).slice(0, 7);
  const mesRotulo = (ms) => { const s = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, month: "short" }).format(ms).replace(".", ""); return s[0].toUpperCase() + s.slice(1); };
  const mascaraCpf = (c) => `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**`;
  const abreviar = (nome) => { const t = nome.trim().split(/\s+/); return t.length > 1 ? `${t[0]} ${t[t.length - 1][0]}.` : t[0]; };
  const ultimaAtividade = (ms) => {
    const p = partes(ms);
    const dias = Math.round((Date.parse(diaChave(agora())) - Date.parse(diaChave(ms))) / 86400000);
    const hora = `${p.hour}h${p.minute}`;
    return dias <= 0 ? `Hoje, ${hora}` : dias === 1 ? `Ontem, ${hora}` : `Há ${dias} dias`;
  };
  const statusRotulo = { ativo: "Ativo", manutencao: "Em manutenção", inativo: "Inativo" };
  const PERGUNTAS = { nome_mae: "Qual o nome da sua mãe?", nascimento: "Qual a data do seu nascimento?", cep: "Qual o CEP do seu endereço?" };
  const TIPOS = Object.keys(PERGUNTAS);
  const RESULTADO = { creditado: "Creditado", duplicado: "Duplicado", nao_participa: "Fora da campanha", invalido: "Código inválido" };

  class Erro extends Error {
    constructor(status, erro, message, extra = {}) { super(message); this.status = status; this.corpo = { erro, message, ...extra }; }
  }
  const validacao = (campos) => new Erro(422, "validacao", "Verifique os campos informados.", { campos });

  /* ── regras de negócio ── */
  const pessoaPorId = (id) => db.pessoas.find((p) => p.id === id);
  const ecoPorId = (id) => db.ecopontos.find((e) => e.id === Number(id));
  const kgDoPonto = (id, de = 0) => db.coletas.filter((c) => c.ecopontoId === id && c.em >= de).reduce((s, c) => s + c.kg, 0);

  function nivelDe(p) {
    const ord = [...db.niveis].sort((a, b) => a.min - b.min);
    const atual = [...ord].reverse().find((n) => p.saldo >= n.min) || ord[0];
    const proximo = ord.find((n) => n.min > atual.min) || null;
    const progresso = proximo ? Math.floor(((p.saldo - atual.min) / (proximo.min - atual.min)) * 100) : 100;
    return { atual, proximo, progresso };
  }
  function viewMe(p, { marcarVisto = true } = {}) {
    const { atual, proximo, progresso } = nivelDe(p);
    const subiu = atual.id !== p.nivelVistoId;
    if (marcarVisto) p.nivelVistoId = atual.id;
    const s = Math.max(0, p.saldo);
    return {
      id: p.id, nome: p.nome, email: p.email, avatar: p.avatarUrl, coins: p.saldo, coins_formatado: fmt(p.saldo),
      nivel: { nome: atual.nome, meta: proximo ? `próximo: ${proximo.nome} (${proximo.min} pts)` : "nível máximo alcançado 🏆", progresso, subiu },
      impacto: { arvores: fmt(Math.floor(s / 40)), agua: `${fmt(Math.round(s * 1.5))}L`, energia: `${fmt(Math.round(s * 0.25))}kWh`, co2: `${fmt(Math.round(s * 0.3))}kg` },
    };
  }
  const usuarioSessao = (p) => ({ id: p.id, nome: p.nome, email: p.email, tipo: "pessoa", perfil: p.perfil, avatar: p.avatarUrl, coins: p.saldo });
  const usuarioEmpresa = (e) => ({ id: e.id, nome: e.nome_empresa, email: e.email, tipo: "empresa", perfil: "comum", avatar: null, cnpj: e.cnpj });

  function emitirToken(tipo, conta, lembrar) {
    const token = crypto.randomBytes(24).toString("hex");
    db.tokens.set(token, { tipo, id: conta.id, perfil: tipo === "pessoa" ? conta.perfil : "comum", expira: agora() + (lembrar ? 30 * 24 : 8) * HORA });
    return token;
  }
  const logar = (d) => db.logs.push({ id: db.prox("log"), em: agora(), ...d });

  function creditar(p, valor, meta) {
    if (p.saldo + valor < 0) throw new Erro(422, "saldo_insuficiente", "Saldo insuficiente.");
    return db.lancar(p, valor, { em: agora(), ...meta });
  }

  function paginar(lista, qs, padrao = 15) {
    const por = Math.min(100, Math.max(1, Number(qs.por_pagina) || padrao));
    const pagina = Math.max(1, Number(qs.pagina) || 1);
    return { data: lista.slice((pagina - 1) * por, pagina * por), meta: { total: lista.length, pagina, por_pagina: por } };
  }

  function respostaResposta(tipo, p, resposta) {
    const r = String(resposta ?? "");
    if (tipo === "nome_mae") return normalizar(r) === normalizar(p.nomeMae);
    if (tipo === "cep") return r.replace(/\D/g, "") === p.cep;
    const m = r.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return !!m && `${m[3]}-${m[2]}-${m[1]}` === p.nascimento;
  }

  /* desafio de 2FA / recuperação (pessoa=null => conta inexistente, desafio falso) */
  function criarDesafio(pessoa, finalidade, { alvo = "", lembrar = false } = {}) {
    const tipo = pessoa ? TIPOS[Math.floor(Math.random() * 3)] : TIPOS[parseInt(sha(alvo).slice(0, 2), 16) % 3];
    const d = { id: db.prox("desafio"), pessoaId: pessoa ? pessoa.id : null, finalidade, tipo, tentativas: 0, max: 3, lembrar, expira: agora() + 5 * MIN, bloqueado: false, resolvido: false, alvo };
    db.desafios.set(d.id, d);
    return d;
  }
  function conferirDesafio(body, finalidade) {
    const d = db.desafios.get(Number(body.desafio_id));
    if (!d || d.finalidade !== finalidade || d.resolvido) throw new Erro(404, "desafio_invalido", "Desafio não encontrado. Faça o login novamente.");
    if (d.bloqueado) throw new Erro(423, "desafio_bloqueado", "3 tentativas sem sucesso! Favor realizar Login novamente.", { tentativas_restantes: 0 });
    if (agora() > d.expira) throw new Erro(410, "desafio_expirado", "O tempo para responder expirou. Faça o login novamente.", { tentativas_restantes: 0 });
    const p = d.pessoaId ? pessoaPorId(d.pessoaId) : null;
    if (p && respostaResposta(d.tipo, p, body.resposta)) {
      d.resolvido = true;
      if (finalidade === "login") logar({ pessoaId: p.id, identificador: p.email, metodo: PERGUNTAS[d.tipo], sucesso: true, tentativa: d.tentativas + 1 });
      return { d, p };
    }
    d.tentativas++;
    if (finalidade === "login") logar({ pessoaId: p ? p.id : null, identificador: d.alvo, metodo: PERGUNTAS[d.tipo], sucesso: false, tentativa: d.tentativas });
    if (d.tentativas >= d.max) {
      d.bloqueado = true;
      throw new Erro(423, "desafio_bloqueado", "3 tentativas sem sucesso! Favor realizar Login novamente.", { tentativas_restantes: 0 });
    }
    throw new Erro(422, "resposta_invalida", "Resposta incorreta.", { tentativas_restantes: d.max - d.tentativas });
  }

  const assinarQr = (e) => crypto.createHmac("sha256", QR_SECRET + e.segredoQr).update(`${e.codigo}|${e.empresaId}|${e.id}`).digest("hex");
  const payloadQr = (e) => `${e.codigo}|emp=${e.empresaId}|ep=${e.id}|sig=${assinarQr(e)}`;

  function idempotente(req, auth, rota, fn) {
    const chave = req.headers["idempotency-key"];
    if (!chave) return fn();
    const k = `${auth.tipo}:${auth.id}:${rota}:${chave}`;
    if (db.idem.has(k)) return db.idem.get(k);
    const r = fn();
    db.idem.set(k, r);
    return r;
  }
  const ok = (status, corpo) => ({ status, corpo });
  const sessaoAtivaDe = (pessoaId, ecopontoId) => [...db.sessoes.values()].filter((s) => s.status === "ativa" && s.expira > agora() && (pessoaId == null || s.pessoaId === pessoaId) && (ecopontoId == null || s.ecopontoId === ecopontoId)).sort((a, b) => b.id - a.id)[0] || null;
  const ecoDaEmpresa = (auth, id) => {
    const e = ecoPorId(id);
    if (!e) throw new Erro(404, "nao_encontrado", "Ecoponto não encontrado.");
    if (e.empresaId !== auth.id) throw new Erro(403, "proibido", "Este ecoponto não pertence à sua empresa.");
    return e;
  };

  function anonimizar(p) {
    Object.assign(p, { nome: "Usuário removido", email: `anonimo-${p.id}@ecotech.invalid`, cpf: String(p.id).padStart(11, "0"), login: `A${String(p.id).padStart(5, "0")}`.slice(0, 6), nomeMae: "", telefoneCelular: "", telefoneFixo: "", logradouro: "", numero: "", bairro: "", cidade: "", uf: "", avatarUrl: null, ativo: false, anonimizadoEm: agora(), nascimento: "1900-01-01", cep: "" });
    for (const [t, v] of db.tokens) if (v.tipo === "pessoa" && v.id === p.id) db.tokens.delete(t);
  }

  /* ── rotas ── */
  const R = [];
  const rota = (metodo, padrao, papel, h) => R.push({ metodo, re: new RegExp(`^${padrao}$`), papel, h });

  rota("GET", "/saude", null, () => ok(200, { status: "ok", banco: "ok (memória)", modo: "demo", versao: "demo-1.0" }));

  // ── públicas
  rota("GET", "/categorias", null, ({ qs }) => ok(200, paginar([...db.categorias].sort((a, b) => a.ordem - b.ordem).map(({ chave, rotulo, cor_hex }) => ({ chave, rotulo, cor_hex })), qs, 100)));
  rota("GET", "/config", null, () => ok(200, { checkin_coins: db.config.checkin_coins, sessao_minutos: db.config.sessao_minutos }));
  rota("GET", "/estatisticas", null, () => ok(200, {
    toneladas: Math.round((db.coletas.reduce((s, c) => s + c.kg, 0) / 1000) * 10) / 10,
    membros: db.pessoas.filter((p) => p.perfil === "comum" && p.ativo).length,
    empresas: db.empresas.filter((e) => e.status === "ativa").length,
    ecopontos: db.ecopontos.filter((e) => e.status === "ativo").length,
  }));
  rota("GET", "/ecopontos", null, ({ qs }) => {
    let l = db.ecopontos;
    if (qs.categoria) l = l.filter((e) => e.categorias.includes(qs.categoria));
    if (qs.status) l = l.filter((e) => e.status === qs.status);
    if (qs.empresa) l = l.filter((e) => String(e.empresaId) === qs.empresa);
    const itens = l.map((e) => ({
      id: e.id, codigo: e.codigo, nome: e.nome, descricao: e.descricao, endereco: e.endereco, cidade: e.cidade, estado: e.estado, lat: e.lat, lng: e.lng,
      status: e.status, status_rotulo: statusRotulo[e.status],
      categorias: e.categorias.map((c) => { const k = db.cat(c); return { chave: k.chave, rotulo: k.rotulo, cor_hex: k.cor_hex }; }),
      kg_coletado_formatado: fmtKg(Math.round(kgDoPonto(e.id) * 10) / 10),
    }));
    return ok(200, paginar(itens, qs, 100));
  });
  rota("GET", "/recompensas", null, ({ qs }) => {
    let l = db.recompensas.filter((r) => r.ativa);
    if (qs.cat && qs.cat !== "todos") l = l.filter((r) => r.categoria === qs.cat);
    return ok(200, paginar(l.sort((a, b) => a.ordem - b.ordem).map(({ id, categoria, icone, nome, descricao, custo_coins }) => ({ id, categoria, icone, nome, descricao, custo_coins })), qs, 100));
  });
  const CEPS = { "20040020": ["Rua da Assembleia", "Centro", "Rio de Janeiro", "RJ"], "22041001": ["Rua Barata Ribeiro", "Copacabana", "Rio de Janeiro", "RJ"], "23010000": ["Estrada de Santa Cruz", "Santa Cruz", "Rio de Janeiro", "RJ"], "24020000": ["Rua Moreira César", "Icaraí", "Niterói", "RJ"], "23900000": ["Av. Raul Pompeia", "Centro", "Angra dos Reis", "RJ"] };
  rota("GET", "/cep/(\\d{8})", null, ({ m }) => {
    const c = CEPS[m[1]];
    if (!c) throw new Erro(404, "cep_nao_encontrado", "CEP não encontrado.");
    return ok(200, { logradouro: c[0], bairro: c[1], cidade: c[2], uf: c[3] });
  });

  // ── cadastro
  rota("POST", "/pessoas", null, ({ body }) => {
    const b = body || {}, campos = {};
    const add = (c, msg) => (campos[c] = [msg]);
    const nome = String(b.nome || "").trim();
    if (nome.length < 15 || nome.length > 80) add("nome", "O nome deve ter de 15 a 80 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || "")) add("email", "E-mail inválido.");
    if (!cpfValido(b.cpf)) add("cpf", "CPF inválido.");
    if (!/^[A-Za-z]{6}$/.test(b.login || "")) add("login", "O login deve ter exatamente 6 letras.");
    if (!senhaForte(b.senha || "")) add("senha", "A senha deve ter 8 ou mais caracteres, com maiúscula, minúscula e número.");
    for (const c of ["nome_mae", "nascimento", "sexo", "logradouro", "numero", "bairro", "cidade"]) if (!String(b[c] || "").trim()) add(c, "Campo obrigatório.");
    if (!/^\d{11}$/.test(b.telefone_celular || "")) add("telefone_celular", "Celular inválido.");
    if (!/^\d{10}$/.test(b.telefone_fixo || "")) add("telefone_fixo", "Telefone fixo inválido.");
    if (!/^\d{8}$/.test(b.cep || "")) add("cep", "CEP inválido.");
    if (!/^[A-Za-z]{2}$/.test(b.uf || "")) add("uf", "UF inválida.");
    if (b.termos_aceitos !== true) add("termos_aceitos", "É preciso aceitar os termos.");
    if (Object.keys(campos).length) throw validacao(campos);
    const dup = (c, msg) => { throw new Erro(409, "duplicado", msg, { campos: { [c]: [msg] } }); };
    if (db.pessoas.some((p) => p.email.toLowerCase() === b.email.toLowerCase())) dup("email", "Este e-mail já está cadastrado.");
    if (db.pessoas.some((p) => p.cpf === String(b.cpf).replace(/\D/g, ""))) dup("cpf", "Este CPF já está cadastrado.");
    if (db.pessoas.some((p) => p.login.toLowerCase() === b.login.toLowerCase())) dup("login", "Este login já está em uso.");
    db.novaPessoa({ nome, email: b.email.toLowerCase(), cpf: String(b.cpf).replace(/\D/g, ""), login: b.login, senha: b.senha, nomeMae: b.nome_mae, nascimento: b.nascimento, sexo: b.sexo, telefoneCelular: b.telefone_celular, telefoneFixo: b.telefone_fixo, cep: b.cep, logradouro: b.logradouro, numero: b.numero, bairro: b.bairro, cidade: b.cidade, uf: String(b.uf).toUpperCase() });
    return ok(201, { message: "Cadastro realizado com sucesso." });
  });
  rota("POST", "/empresas", null, ({ body }) => {
    const b = body || {}, campos = {};
    if (!cnpjValido(b.cnpj)) campos.cnpj = ["CNPJ inválido."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || "")) campos.email = ["E-mail inválido."];
    if (!senhaForte(b.senha || "")) campos.senha = ["A senha deve ter 8 ou mais caracteres, com maiúscula, minúscula e número."];
    for (const c of ["nome_empresa", "razao_social", "endereco"]) if (!String(b[c] || "").trim()) campos[c] = ["Campo obrigatório."];
    if (Object.keys(campos).length) throw validacao(campos);
    if (db.empresas.some((e) => e.email.toLowerCase() === b.email.toLowerCase())) throw new Erro(409, "duplicado", "Este e-mail já está cadastrado.", { campos: { email: ["Este e-mail já está cadastrado."] } });
    const sal = `e${db.empresas.length}`;
    db.empresas.push({ id: db.empresas.length + 1, nome_empresa: b.nome_empresa, razao_social: b.razao_social, email: b.email.toLowerCase(), endereco: b.endereco, cnpj: String(b.cnpj).replace(/\D/g, ""), status: "ativa", sal, senhaHash: hashSenha(b.senha, sal) });
    return ok(201, { message: "Cadastro realizado com sucesso." });
  });

  // ── autenticação
  rota("POST", "/auth/login", null, ({ body }) => {
    const b = body || {};
    const id = String(b.email || b.login || "").trim();
    const empresa = b.email ? db.empresas.find((e) => e.email === id.toLowerCase()) : null;
    if (empresa && empresa.status === "ativa" && empresa.senhaHash === hashSenha(b.senha, empresa.sal)) {
      return ok(200, { token: emitirToken("empresa", empresa, b.lembrar), usuario: usuarioEmpresa(empresa) });
    }
    const p = db.pessoas.find((x) => x.ativo && (b.email ? x.email === id.toLowerCase() : x.login.toLowerCase() === id.toLowerCase()));
    if (!p || p.senhaHash !== hashSenha(b.senha, p.sal)) {
      logar({ pessoaId: p ? p.id : null, identificador: id, metodo: "Senha", sucesso: false, tentativa: 1 });
      throw new Erro(401, "credenciais", "E-mail ou senha incorretos.");
    }
    const d = criarDesafio(p, "login", { alvo: id, lembrar: !!b.lembrar });
    return ok(200, { status: "2fa", desafio_id: d.id, pergunta: PERGUNTAS[d.tipo], pergunta_tipo: d.tipo });
  });
  rota("POST", "/auth/2fa", null, ({ body }) => {
    const { d, p } = conferirDesafio(body || {}, "login");
    return ok(200, { token: emitirToken("pessoa", p, d.lembrar), usuario: usuarioSessao(p) });
  });
  rota("POST", "/auth/logout", "qualquer", ({ req }) => {
    db.tokens.delete((req.headers.authorization || "").replace(/^Bearer /, ""));
    return ok(204, null);
  });
  rota("POST", "/auth/google", null, () => { throw new Erro(501, "indisponivel", "O login com Google não está disponível no modo demonstração."); });
  rota("POST", "/auth/esqueci-senha", null, ({ body }) => {
    const email = String((body || {}).email || "").trim().toLowerCase();
    const p = db.pessoas.find((x) => x.ativo && x.email === email);
    const d = criarDesafio(p || null, "recuperar_senha", { alvo: email });
    return ok(200, { desafio_id: d.id, pergunta: PERGUNTAS[d.tipo], pergunta_tipo: d.tipo });
  });
  rota("POST", "/auth/esqueci-senha/verificar", null, ({ body }) => {
    const { p } = conferirDesafio(body || {}, "recuperar_senha");
    const token = crypto.randomBytes(20).toString("hex");
    db.resets.set(token, { pessoaId: p.id, expira: agora() + 10 * MIN });
    return ok(200, { token });
  });
  rota("POST", "/auth/redefinir-senha", null, ({ body }) => {
    const b = body || {};
    const r = db.resets.get(b.token);
    if (!r || agora() > r.expira) throw new Erro(410, "token_expirado", "O link de redefinição expirou. Comece de novo.");
    if (!senhaForte(b.nova_senha || "")) throw validacao({ nova_senha: ["A senha deve ter 8 ou mais caracteres, com maiúscula, minúscula e número."] });
    const p = pessoaPorId(r.pessoaId);
    p.senhaHash = hashSenha(b.nova_senha, p.sal);
    db.resets.delete(b.token);
    return ok(200, { message: "Senha alterada com sucesso." });
  });

  // ── pessoa
  const soPessoa = (auth) => pessoaPorId(auth.id);
  rota("GET", "/me", "pessoa", ({ auth }) => ok(200, { data: viewMe(soPessoa(auth)) }));
  rota("PUT", "/me", "pessoa", ({ auth, body }) => {
    const p = soPessoa(auth), b = body || {};
    const nome = String(b.nome || "").trim();
    if (nome.length < 15 || nome.length > 80) throw validacao({ nome: ["O nome deve ter de 15 a 80 caracteres."] });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || "")) throw validacao({ email: ["E-mail inválido."] });
    if (db.pessoas.some((x) => x.id !== p.id && x.email === b.email.toLowerCase())) throw new Erro(409, "duplicado", "Este e-mail já está cadastrado.", { campos: { email: ["Este e-mail já está cadastrado."] } });
    p.nome = nome; p.email = b.email.toLowerCase(); p.avatarUrl = b.avatar_url || null;
    return ok(200, { data: viewMe(p, { marcarVisto: false }) });
  });
  rota("DELETE", "/me", "pessoa", ({ auth }) => {
    const p = soPessoa(auth);
    if (p.perfil === "master") throw new Erro(403, "proibido", "A conta master não pode ser excluída.");
    anonimizar(p);
    return ok(204, null);
  });
  rota("PUT", "/me/senha", "pessoa", ({ auth, body }) => {
    const p = soPessoa(auth), b = body || {};
    if (p.perfil === "master") throw new Erro(403, "proibido", "Somente o usuário comum pode alterar a própria senha.");
    if (p.senhaHash !== hashSenha(b.senha_atual, p.sal)) throw new Erro(422, "senha_atual", "Senha atual incorreta.");
    if (!senhaForte(b.nova_senha || "")) throw validacao({ nova_senha: ["A senha deve ter 8 ou mais caracteres, com maiúscula, minúscula e número."] });
    p.senhaHash = hashSenha(b.nova_senha, p.sal);
    return ok(200, { message: "Senha alterada com sucesso." });
  });
  rota("GET", "/me/coins", "pessoa", ({ auth }) => { const p = soPessoa(auth); return ok(200, { balance: p.saldo, balance_formatado: fmt(p.saldo) }); });
  rota("GET", "/me/movimentos", "pessoa", ({ auth, qs }) => {
    const l = db.movimentos.filter((m) => m.pessoaId === auth.id).sort((a, b) => b.id - a.id).map((m) => ({
      id: m.id, tipo: m.tipo, titulo: m.titulo, subtitulo: m.subtitulo, icone: m.icone, valor: m.valor, valor_formatado: `${m.valor > 0 ? "+" : ""}${m.valor}`, data: new Date(m.em).toISOString(), data_formatada: dataFmt(m.em),
    }));
    return ok(200, paginar(l, qs));
  });

  rota("POST", "/resgates", "pessoa", ({ req, auth, body }) => idempotente(req, auth, "POST /resgates", () => {
    const p = soPessoa(auth);
    const r = db.recompensas.find((x) => x.id === Number((body || {}).recompensa_id) && x.ativa);
    if (!r) throw new Erro(404, "nao_encontrado", "Recompensa não encontrada.");
    const mov = creditar(p, -r.custo_coins, { tipo: "resgate", titulo: r.nome, subtitulo: null, icone: r.icone, origemTipo: "resgate" });
    const cupom = `CUP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    db.resgates.push({ id: db.prox("resgate"), pessoaId: p.id, recompensaId: r.id, custo: r.custo_coins, cupom, movimentoId: mov.id, status: "emitido", em: agora() });
    return ok(201, { message: `Resgate realizado: ${r.nome}.`, codigo_cupom: cupom });
  }));

  // ── fluxo do ecoponto (pessoa)
  rota("POST", "/ecopontos/conectar", "pessoa", ({ auth, body }) => {
    const m = String((body || {}).qr || "").match(/^(ECO-\d+)\|emp=(\d+)\|ep=(\d+)\|sig=([0-9a-f]{64})$/);
    const e = m && ecoPorId(m[3]);
    const valida = e && e.codigo === m[1] && String(e.empresaId) === m[2] && crypto.timingSafeEqual(Buffer.from(m[4]), Buffer.from(assinarQr(e)));
    if (!valida) throw new Erro(422, "qr_invalido", "QR inválido. Escaneie a placa do Ecoponto.");
    if (e.status !== "ativo") throw new Erro(422, "ecoponto_indisponivel", `Este Ecoponto está ${statusRotulo[e.status].toLowerCase()} no momento.`);
    let s = sessaoAtivaDe(auth.id, e.id);
    if (!s) {
      s = { id: db.prox("sessao"), ecopontoId: e.id, pessoaId: auth.id, status: "ativa", expira: agora() + db.config.sessao_minutos * MIN };
      db.sessoes.set(s.id, s);
    }
    return ok(200, { sessao_id: s.id, ecoponto: { id: e.id, codigo: e.codigo, nome: e.nome }, expira_em: new Date(s.expira).toISOString(), message: `Conectado ao ${e.nome}.` });
  });
  rota("POST", "/checkins", "pessoa", ({ req, auth, body }) => idempotente(req, auth, "POST /checkins", () => {
    const s = db.sessoes.get(Number((body || {}).sessao_id));
    if (!s || s.pessoaId !== auth.id || s.status !== "ativa" || s.expira <= agora()) throw new Erro(403, "sessao_invalida", "Sessão do Ecoponto inválida ou expirada. Leia o QR da placa de novo.");
    const e = ecoPorId(s.ecopontoId), p = soPessoa(auth);
    const ultimo = db.coletas.filter((c) => c.tipo === "checkin" && c.pessoaId === p.id && c.ecopontoId === e.id).sort((a, b) => b.em - a.em)[0];
    const espera = ultimo ? ultimo.em + db.config.checkin_cooldown_min * MIN - agora() : 0;
    if (espera > 0) throw new Erro(429, "cooldown", `Você já fez check-in aqui. Próximo check-in em ${Math.ceil(espera / MIN)} min.`);
    const coins = db.config.checkin_coins, kg = 0.5;
    const id = db.prox("coleta");
    db.coletas.push({ id, ecopontoId: e.id, pessoaId: p.id, categoriaId: null, kg, coins, tipo: "checkin", em: agora() });
    creditar(p, coins, { tipo: "checkin", titulo: `Check-in em ${e.nome}`, subtitulo: e.codigo, icone: "📍", origemTipo: "coleta", origemId: id });
    return ok(200, { coinsAwarded: coins, balance: p.saldo, message: `Check-in feito: +${coins} coins e 0,5 kg.` });
  }));

  // ── fluxo do ecoponto (empresa)
  rota("GET", "/ecopontos/(\\d+)/qr", "empresa", ({ auth, m }) => ok(200, { payload: payloadQr(ecoDaEmpresa(auth, m[1])) }));
  rota("GET", "/ecopontos/(\\d+)/qr\\.svg", "empresa", ({ auth, m }) => {
    const e = ecoDaEmpresa(auth, m[1]);
    const q = qrcode(0, "M");
    q.addData(payloadQr(e));
    q.make();
    return { status: 200, tipo: "image/svg+xml", texto: q.createSvgTag({ cellSize: 6, margin: 4, scalable: true }) };
  });
  rota("GET", "/ecopontos/(\\d+)/sessao-ativa", "empresa", ({ auth, m }) => {
    const e = ecoDaEmpresa(auth, m[1]);
    const s = sessaoAtivaDe(null, e.id);
    if (!s) throw new Erro(404, "sem_sessao", "Nenhuma pessoa conectada.");
    return ok(200, { sessao_id: s.id, pessoa: { nome: abreviar(pessoaPorId(s.pessoaId).nome) }, expira_em: new Date(s.expira).toISOString() });
  });
  rota("POST", "/ecopontos/(\\d+)/leituras", "empresa", ({ req, auth, m, body }) => idempotente(req, auth, `POST /ecopontos/${m[1]}/leituras`, () => {
    const e = ecoDaEmpresa(auth, m[1]), b = body || {};
    const s = db.sessoes.get(Number(b.sessao_id));
    if (!s || s.ecopontoId !== e.id || s.status !== "ativa" || s.expira <= agora()) throw new Erro(403, "sessao_invalida", "Sessão inválida ou expirada. Peça para a pessoa ler o QR da placa de novo.");
    const p = pessoaPorId(s.pessoaId);
    const code = String(b.code || "").replace(/\D/g, "");
    const registrar = (resultado, extra = {}) => db.leituras.push({ id: db.prox("leitura"), ecopontoId: e.id, pessoaId: p.id, codigo: code, produto: "", categoria: "", kg: 0, coins: 0, resultado, em: agora(), coletaId: null, ...extra });
    if (!eanValido(code)) { registrar("invalido"); throw new Erro(422, "ean_invalido", "Código inválido: o dígito verificador não confere."); }
    const prod = db.produtos.find((x) => x.codigo === code);
    if (!prod) { registrar("nao_participa"); throw new Erro(404, "fora_da_campanha", "Este produto não participa da campanha."); }
    const c = db.categorias.find((x) => x.id === prod.categoriaId);
    const limite = agora() - db.config.duplicidade_horas * HORA;
    if (db.leituras.some((l) => l.pessoaId === p.id && l.codigo === code && l.resultado === "creditado" && l.em > limite)) {
      registrar("duplicado", { produto: prod.nome, categoria: c.rotulo });
      throw new Erro(409, "duplicado", "Este produto já foi lido por esta pessoa nas últimas 24 horas.");
    }
    const cid = db.prox("coleta");
    db.coletas.push({ id: cid, ecopontoId: e.id, pessoaId: p.id, categoriaId: c.id, kg: prod.peso_kg, coins: prod.coins, tipo: "entrega", em: agora() });
    registrar("creditado", { produto: prod.nome, categoria: c.rotulo, kg: prod.peso_kg, coins: prod.coins, coletaId: cid });
    creditar(p, prod.coins, { tipo: "leitura", titulo: prod.nome, subtitulo: e.codigo, icone: c.icone, origemTipo: "coleta", origemId: cid });
    return ok(200, { coinsAwarded: prod.coins, message: `${prod.nome} validado: +${prod.coins} coins.`, produto: { nome: prod.nome } });
  }));

  // ── empresa: painel e exportação
  const mesesAtras = (n) => { const d = new Date(agora()); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - n); return d.getTime(); };
  rota("GET", "/empresas/me/dashboard", "empresa", ({ auth }) => {
    const emp = db.empresas.find((x) => x.id === auth.id);
    const meus = db.ecopontos.filter((e) => e.empresaId === emp.id);
    const ids = new Set(meus.map((e) => e.id));
    const col = db.coletas.filter((c) => ids.has(c.ecopontoId));
    const meses = [5, 4, 3, 2, 1, 0].map((n) => mesesAtras(n));
    const valores = meses.map((ini, i) => Math.round(col.filter((c) => c.em >= ini && (i === 5 || c.em < meses[i + 1])).reduce((s, c) => s + c.kg, 0)));
    const total = valores.reduce((a, b) => a + b, 0);
    const [ant, cur] = [valores[4], valores[5]];
    const variacao = ant ? Math.round(((cur - ant) / ant) * 100) : 0;
    const porCat = db.categorias.map((c) => ({ c, kg: col.filter((x) => x.categoriaId === c.id).reduce((s, x) => s + x.kg, 0) })).filter((x) => x.kg > 0);
    const somaCat = porCat.reduce((s, x) => s + x.kg, 0) || 1;
    const bruto = porCat.map((x) => ({ ...x, exato: (x.kg / somaCat) * 100 }));
    bruto.forEach((x) => (x.pct = Math.floor(x.exato)));
    let resto = 100 - bruto.reduce((s, x) => s + x.pct, 0);
    [...bruto].sort((a, b) => (b.exato % 1) - (a.exato % 1)).forEach((x) => { if (resto-- > 0) x.pct++; });
    return ok(200, { data: {
      empresa: { nome: emp.nome_empresa },
      totais: {
        ecopontos: meus.length,
        kg_formatado: fmt(Math.round(col.reduce((s, c) => s + c.kg, 0))),
        validacoes_formatado: fmt(db.leituras.filter((l) => ids.has(l.ecopontoId) && l.resultado === "creditado").length),
        ativos: meus.filter((e) => e.status === "ativo").length,
        variacao_kg_texto: ant ? `${variacao >= 0 ? "↑" : "↓"} ${Math.abs(variacao)}% vs mês anterior` : "sem mês anterior",
      },
      serie: { labels: meses.map(mesRotulo), valores, valores_formatados: valores.map(fmt), total_formatado: `Total: ${fmt(total)} kg` },
      categorias: bruto.sort((a, b) => b.pct - a.pct).map((x) => ({ chave: x.c.chave, rotulo: x.c.rotulo, cor_hex: x.c.cor_hex, percentual: x.pct })),
      ecopontos: meus.map((e) => {
        const ult = db.coletas.filter((c) => c.ecopontoId === e.id).sort((a, b) => b.em - a.em)[0];
        return {
          id: e.id, codigo: e.codigo, nome: e.nome, endereco: `${e.endereco}, ${e.cidade}`, status: e.status, status_rotulo: statusRotulo[e.status],
          categorias: e.categorias.map((c) => { const k = db.cat(c); return { chave: k.chave, rotulo: k.rotulo, cor_hex: k.cor_hex }; }),
          kg_mes_formatado: fmtKg(Math.round(kgDoPonto(e.id, meses[5]))), ultima_atividade: ult ? ultimaAtividade(ult.em) : "—",
        };
      }),
    } });
  });
  rota("GET", "/empresas/me/leituras", "empresa", ({ auth, qs }) => {
    const meus = new Set(db.ecopontos.filter((e) => e.empresaId === auth.id).map((e) => e.id));
    if (qs.ecoponto_id) ecoDaEmpresa(auth, qs.ecoponto_id);
    const de = { "3m": mesesAtras(2), "6m": mesesAtras(5), tudo: 0 }[qs.periodo] ?? mesesAtras(0);
    const l = db.leituras.filter((x) => meus.has(x.ecopontoId) && x.em >= de && (!qs.ecoponto_id || x.ecopontoId === Number(qs.ecoponto_id))).sort((a, b) => b.em - a.em);
    return ok(200, paginar(l.map((x) => {
      const e = ecoPorId(x.ecopontoId);
      return { data_formatada: dataFmt(x.em), ecoponto_codigo: e.codigo, ecoponto_nome: e.nome, produto: x.produto || "—", categoria: x.categoria || "—", kg_formatado: x.resultado === "creditado" ? fmtKg(x.kg) : "—", coins: x.coins, resultado_rotulo: RESULTADO[x.resultado] };
    }), qs, 100));
  });

  // ── master
  rota("GET", "/admin/pessoas", "master", ({ qs }) => {
    const t = normalizar(qs.busca);
    const l = db.pessoas.filter((p) => p.perfil === "comum" && p.ativo && (!t || normalizar(p.nome).includes(t))).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return ok(200, paginar(l.map((p) => ({ id: p.id, nome: p.nome, email: p.email, cpf_mascarado: mascaraCpf(p.cpf) })), qs, 100));
  });
  rota("DELETE", "/admin/pessoas/(\\d+)", "master", ({ m }) => {
    const p = pessoaPorId(Number(m[1]));
    if (!p || p.perfil !== "comum" || !p.ativo) throw new Erro(404, "nao_encontrado", "Usuário não encontrado.");
    anonimizar(p);
    return ok(204, null);
  });
  rota("GET", "/admin/logs-autenticacao", "master", ({ qs }) => {
    const t = qs.termo ? normalizar(qs.termo) : "";
    const l = db.logs.filter((x) => x.pessoaId && pessoaPorId(x.pessoaId)?.perfil === "comum").sort((a, b) => b.em - a.em).filter((x) => {
      if (!t) return true;
      const p = pessoaPorId(x.pessoaId);
      return qs.tipo === "cpf" ? p.cpf.includes(String(qs.termo).replace(/\D/g, "")) : normalizar(p.nome).includes(t);
    });
    return ok(200, paginar(l.map((x) => { const p = pessoaPorId(x.pessoaId); return { data_formatada: dataFmt(x.em), nome: p.nome, cpf_mascarado: mascaraCpf(p.cpf), metodo_2fa: x.metodo, sucesso: x.sucesso }; }), qs, 100));
  });

  /* ── servidor HTTP ── */
  const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Idempotency-Key", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", "Access-Control-Expose-Headers": "X-EcoTech-Modo", "X-EcoTech-Modo": "demo" };
  function enviar(res, status, corpo, tipo = "application/json; charset=utf-8") {
    const dados = corpo == null ? "" : typeof corpo === "string" ? corpo : JSON.stringify(corpo);
    res.writeHead(status, { ...CORS, "Content-Type": tipo, "Cache-Control": "no-store" });
    res.end(status === 204 ? undefined : dados);
  }

  const servidor = http.createServer((req, res) => {
    if (req.method === "OPTIONS") return enviar(res, 204, null);
    const url = new URL(req.url, "http://x");
    const caminho = url.pathname.replace(/^\/api\/v1/, "") || "/";
    const qs = Object.fromEntries(url.searchParams);
    let bruto = "";
    req.on("data", (d) => { bruto += d; if (bruto.length > 1e6) req.destroy(); });
    req.on("end", () => {
      try {
        let body = null;
        if (bruto) { try { body = JSON.parse(bruto); } catch { throw new Erro(400, "json_invalido", "Corpo da requisição inválido."); } }
        const r = R.find((x) => x.metodo === req.method && x.re.test(caminho));
        if (!r) {
          if (R.some((x) => x.re.test(caminho))) throw new Erro(405, "metodo", "Método não permitido.");
          throw new Erro(404, "nao_encontrado", "Rota não encontrada.");
        }
        let auth = null;
        if (r.papel) {
          const t = db.tokens.get((req.headers.authorization || "").replace(/^Bearer /, ""));
          if (!t || t.expira <= agora()) throw new Erro(401, "nao_autenticado", "Sua sessão expirou. Entre novamente.");
          if (r.papel === "pessoa" && t.tipo !== "pessoa") throw new Erro(403, "proibido", "Você não tem permissão para fazer isso.");
          if (r.papel === "empresa" && t.tipo !== "empresa") throw new Erro(403, "proibido", "Você não tem permissão para fazer isso.");
          if (r.papel === "master" && !(t.tipo === "pessoa" && t.perfil === "master")) throw new Erro(403, "proibido", "Somente o usuário master tem acesso a esta área.");
          auth = t;
        }
        const out = r.h({ req, qs, body, auth, m: caminho.match(r.re) });
        if (out.texto != null) return enviar(res, out.status, out.texto, out.tipo);
        enviar(res, out.status, out.corpo);
      } catch (e) {
        if (e instanceof Erro) return enviar(res, e.status, e.corpo);
        console.error("[demo] erro inesperado:", e);
        enviar(res, 500, { erro: "interno", message: "Erro interno do servidor de demonstração." });
      }
    });
  });
  servidor.db = db;
  return servidor;
}
