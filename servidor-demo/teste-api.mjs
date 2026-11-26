// Autoteste do servidor de demonstração: percorre os fluxos do front pela API.
import { criarApi } from "./api-demo.mjs";
import { eanValido, cpfValido } from "./dados.mjs";

// valores válidos gerados na hora (CPF com DV e EAN-13 fora do catálogo)
const gerarEan = (base12) => { for (let d = 0; d < 10; d++) if (eanValido(base12 + d)) return base12 + d; };
function gerarCpf(base9) {
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(base9[i] ?? 0) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  const c = base9 + dv(9);
  return c + (() => { let s = 0; for (let i = 0; i < 10; i++) s += Number(c[i]) * (11 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; })();
}

let agoraMs = Date.now();
const srv = criarApi({ agora: () => agoraMs, cooldownMin: 2 });
await new Promise((r) => srv.listen(0, r));
const base = `http://127.0.0.1:${srv.address().port}/api/v1`;
let passou = 0, falhou = 0;
const ok = (c, m) => { c ? passou++ : falhou++; console.log(c ? "PASS" : "FAIL", m); };

async function chamar(metodo, caminho, { corpo, token, idem } = {}) {
  const r = await fetch(base + caminho, { method: metodo, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(idem ? { "Idempotency-Key": idem } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  return { s: r.status, j, t, h: r.headers };
}
const entrarPessoa = async (login, senha, respostas) => {
  const l = await chamar("POST", "/auth/login", { corpo: { login, senha } });
  const r = await chamar("POST", "/auth/2fa", { corpo: { desafio_id: l.j.desafio_id, resposta: respostas[l.j.pergunta_tipo] } });
  return r.j.token;
};
const RESP_DEMO = { nome_mae: "ana souza", nascimento: "14/03/1995", cep: "20040020" };
const RESP_MASTER = { nome_mae: "Maria Master", nascimento: "01/01/1980", cep: "20040020" };

// saúde e cabeçalho de modo demonstração
let r = await chamar("GET", "/saude");
ok(r.s === 200 && r.j.modo === "demo" && r.h.get("x-ecotech-modo") === "demo", "saúde: modo demo + cabeçalho X-EcoTech-Modo");
r = await chamar("OPTIONS", "/me");
ok(r.s === 204, "CORS: preflight 204");

// login + 2FA
r = await chamar("POST", "/auth/login", { corpo: { login: "DEMOUS", senha: "errada" } });
ok(r.s === 401 && r.j.message === "E-mail ou senha incorretos.", "login: senha errada → 401 com message");
r = await chamar("POST", "/auth/login", { corpo: { email: "demo@ecotech.com", senha: "Demo1234", lembrar: true } });
ok(r.s === 200 && r.j.status === "2fa" && ["nome_mae", "nascimento", "cep"].includes(r.j.pergunta_tipo), "login: pessoa → desafio 2FA com pergunta_tipo");
const desafio = r.j;
r = await chamar("POST", "/auth/2fa", { corpo: { desafio_id: desafio.desafio_id, resposta: "x" } });
ok(r.s === 422 && r.j.tentativas_restantes === 2, "2FA: erro → 422 com tentativas_restantes");
r = await chamar("POST", "/auth/2fa", { corpo: { desafio_id: desafio.desafio_id, resposta: RESP_DEMO[desafio.pergunta_tipo] } });
ok(r.s === 200 && r.j.token && r.j.usuario.perfil === "comum" && r.j.usuario.tipo === "pessoa", "2FA: resposta certa → token + usuário");
const tokenDemo = r.j.token;
let bloq;
{ const l = await chamar("POST", "/auth/login", { corpo: { login: "CARLOS", senha: "Carlos123" } });
  for (let i = 0; i < 3; i++) bloq = await chamar("POST", "/auth/2fa", { corpo: { desafio_id: l.j.desafio_id, resposta: "errada" } });
  ok(bloq.s === 423 && bloq.j.message === "3 tentativas sem sucesso! Favor realizar Login novamente.", "2FA: 3 erros → 423 com a mensagem do enunciado");
  const dep = await chamar("POST", "/auth/2fa", { corpo: { desafio_id: l.j.desafio_id, resposta: "certa" } });
  ok(dep.s === 423, "2FA: desafio bloqueado continua bloqueado"); }

// rotas protegidas
r = await chamar("GET", "/me");
ok(r.s === 401, "sem token → 401");
r = await chamar("GET", "/me", { token: tokenDemo });
const me = r.j.data;
ok(r.s === 200 && me.coins === 1250 && me.coins_formatado === "1.250" && me.nivel.nome === "Reciclador Prata" && me.nivel.progresso === 75 && me.impacto.arvores === "31" && me.impacto.agua === "1.875L", "me: saldo, nível (75%) e impacto calculados no servidor");
r = await chamar("GET", "/me/movimentos?por_pagina=5", { token: tokenDemo });
ok(r.s === 200 && r.j.data.length === 5 && r.j.data[0].data_formatada.includes(" às ") && r.j.meta.total >= 9 && /^[+-]/.test(r.j.data[0].valor_formatado), "movimentos: paginado, formatado, mais recente primeiro");
r = await chamar("GET", "/admin/pessoas", { token: tokenDemo });
ok(r.s === 403, "pessoa comum → 403 nas rotas do master");

// listas públicas
r = await chamar("GET", "/ecopontos?por_pagina=100");
ok(r.s === 200 && r.j.meta.total === 22 && r.j.data[0].categorias[0].cor_hex && r.j.data[0].status_rotulo, "ecopontos: 22 pontos com categorias e rótulos");
r = await chamar("GET", "/ecopontos?por_pagina=10&pagina=3");
ok(r.j.data.length === 2 && r.j.meta.pagina === 3, "ecopontos: paginação");
r = await chamar("GET", "/recompensas?cat=food");
ok(r.j.data.length === 3, "recompensas: filtro ?cat=food");
r = await chamar("GET", "/categorias");
ok(r.j.data.length === 6, "categorias: 6");
r = await chamar("GET", "/cep/20040020"); const c2 = await chamar("GET", "/cep/99999999");
ok(r.j.cidade === "Rio de Janeiro" && c2.s === 404, "CEP: achado e 404");
r = await chamar("GET", "/estatisticas");
ok(r.j.ecopontos === 19 && r.j.empresas === 3 && r.j.toneladas > 0, "estatísticas públicas");

// cadastro
const CPF_NOVO = gerarCpf("746903680");
ok(cpfValido(CPF_NOVO), "teste: CPF gerado é válido");
const cad = { nome: "Fulano de Tal da Silva", email: "novo@ex.com", cpf: "52998224725", login: "NOVOUS", senha: "Senha123", nome_mae: "Mãe", nascimento: "2000-01-01", sexo: "masculino", telefone_celular: "21999991234", telefone_fixo: "2133331234", cep: "20040020", logradouro: "Rua", numero: "1", bairro: "Centro", cidade: "Rio", uf: "RJ", termos_aceitos: true };
r = await chamar("POST", "/pessoas", { corpo: cad });
ok(r.s === 409 && r.j.campos.cpf, "cadastro: CPF repetido → 409 com campos (o CPF 529.982.247-25 é do master)");
r = await chamar("POST", "/pessoas", { corpo: { ...cad, cpf: CPF_NOVO, nome: "curto" } });
ok(r.s === 422 && r.j.campos.nome, "cadastro: nome curto → 422 com campos");
r = await chamar("POST", "/pessoas", { corpo: { ...cad, cpf: CPF_NOVO } });
ok(r.s === 201, "cadastro: sucesso 201 (sem token → front vai ao login)");
r = await chamar("POST", "/pessoas", { corpo: { ...cad, cpf: gerarCpf("111222333"), email: "outro@ex.com" } });
ok(r.s === 409 && r.j.campos.login, "cadastro: login repetido → 409");

// ecoponto: empresa gera QR, pessoa conecta
const lemp = await chamar("POST", "/auth/login", { corpo: { email: "empresa@ecotech.com", senha: "Empresa123" } });
ok(lemp.s === 200 && lemp.j.usuario.tipo === "empresa" && lemp.j.token, "login empresa: token direto, sem 2FA");
const tokenEmp = lemp.j.token;
r = await chamar("GET", "/ecopontos/1/qr.svg", { token: tokenEmp });
ok(r.s === 200 && r.t.startsWith("<svg") && r.h.get("content-type").includes("svg"), "qr.svg: SVG gerado no servidor");
const qr = (await chamar("GET", "/ecopontos/1/qr", { token: tokenEmp })).j.payload;
ok(/^ECO-01\|emp=1\|ep=1\|sig=[0-9a-f]{64}$/.test(qr), "qr: payload assinado");
r = await chamar("GET", "/ecopontos/9/qr.svg", { token: tokenEmp });
ok(r.s === 403, "qr: ecoponto de outra empresa → 403");
r = await chamar("POST", "/ecopontos/conectar", { token: tokenDemo, corpo: { qr: qr.slice(0, -1) + (qr.endsWith("0") ? "1" : "0") } });
ok(r.s === 422 && r.j.erro === "qr_invalido", "conectar: assinatura adulterada → 422");
r = await chamar("POST", "/ecopontos/conectar", { token: tokenDemo, corpo: { qr } });
ok(r.s === 200 && r.j.sessao_id && r.j.ecoponto.codigo === "ECO-01", "conectar: sessão criada");
const sessao = r.j.sessao_id;
const r2 = await chamar("POST", "/ecopontos/conectar", { token: tokenDemo, corpo: { qr } });
ok(r2.j.sessao_id === sessao, "conectar: repetir devolve a mesma sessão");
r = await chamar("GET", "/ecopontos/1/sessao-ativa", { token: tokenEmp });
ok(r.s === 200 && r.j.sessao_id === sessao && r.j.pessoa.nome === "Maria D.", "sessao-ativa: nome abreviado");
r = await chamar("GET", "/ecopontos/2/sessao-ativa", { token: tokenEmp });
ok(r.s === 404 && r.j.erro === "sem_sessao", "sessao-ativa: 404 sem ninguém conectado");

// check-in
r = await chamar("POST", "/checkins", { token: tokenDemo, corpo: { sessao_id: sessao }, idem: "k1" });
ok(r.s === 200 && r.j.coinsAwarded === 50 && r.j.balance === 1300, "check-in: +50 coins");
r = await chamar("POST", "/checkins", { token: tokenDemo, corpo: { sessao_id: sessao }, idem: "k1" });
ok(r.s === 200 && r.j.balance === 1300, "check-in: mesma Idempotency-Key não credita de novo");
r = await chamar("POST", "/checkins", { token: tokenDemo, corpo: { sessao_id: sessao }, idem: "k2" });
ok(r.s === 429 && r.j.erro === "cooldown", "check-in: cooldown → 429");
agoraMs += 3 * 60000;
r = await chamar("POST", "/checkins", { token: tokenDemo, corpo: { sessao_id: sessao }, idem: "k3" });
ok(r.s === 200 && r.j.balance === 1350, "check-in: depois do cooldown credita");

// leituras do Ecoponto
const lei = (code, idem, ep = 1, sid = sessao) => chamar("POST", `/ecopontos/${ep}/leituras`, { token: tokenEmp, corpo: { sessao_id: sid, code }, idem });
r = await lei("7891910000197", "L1");
ok(r.s === 200 && r.j.coinsAwarded === 80 && r.j.produto.nome === "Pilha Alcalina AA" && /\+80 coins/.test(r.j.message), "leitura: produto da campanha credita a pessoa da sessão");
r = await chamar("GET", "/me/coins", { token: tokenDemo });
ok(r.j.balance === 1430 && r.j.balance_formatado === "1.430", "saldo da pessoa subiu com a leitura feita pelo Ecoponto");
r = await lei("7891910000197", "L1");
ok(r.s === 200 && r.j.coinsAwarded === 80, "leitura: Idempotency-Key repetida devolve o mesmo resultado");
r = await chamar("GET", "/me/coins", { token: tokenDemo });
ok(r.j.balance === 1430, "leitura: repetida não credita de novo");
r = await lei("7891910000197", "L2");
ok(r.s === 409 && /24 horas/.test(r.j.message), "leitura: mesmo produto em 24 h → 409");
r = await lei("7891910000198", "L3");
ok(r.s === 422 && r.j.erro === "ean_invalido", "leitura: dígito verificador errado → 422");
r = await lei(gerarEan("789000000000"), "L4"); // DV válido, fora do catálogo
ok(r.s === 404 && /não participa/.test(r.j.message), "leitura: fora da campanha → 404");
r = await lei("7896004004778", "L5", 1, 99999);
ok(r.s === 403, "leitura: sessão inexistente → 403");
r = await chamar("POST", "/ecopontos/9/leituras", { token: tokenEmp, corpo: { sessao_id: sessao, code: "7896004004778" } });
ok(r.s === 403, "leitura: ecoponto de outra empresa → 403");
r = await chamar("POST", "/ecopontos/1/leituras", { token: tokenDemo, corpo: { sessao_id: sessao, code: "7896004004778" } });
ok(r.s === 403, "leitura: pessoa não pode ler produtos (só o Ecoponto)");

// resgate
r = await chamar("POST", "/resgates", { token: tokenDemo, corpo: { recompensa_id: 9 }, idem: "R1" });
ok(r.s === 201 && /^CUP-[0-9A-F]{6}$/.test(r.j.codigo_cupom), "resgate: cupom emitido");
r = await chamar("GET", "/me/coins", { token: tokenDemo });
ok(r.j.balance === 1130, "resgate: saldo debitado (1430 − 300)");
r = await chamar("POST", "/resgates", { token: tokenDemo, corpo: { recompensa_id: 9 }, idem: "R1" });
const r3 = await chamar("GET", "/me/coins", { token: tokenDemo });
ok(r.s === 201 && r3.j.balance === 1130, "resgate: Idempotency-Key repetida não debita de novo");
for (const k of ["R2", "R3", "R4"]) await chamar("POST", "/resgates", { token: tokenDemo, corpo: { recompensa_id: 9 }, idem: k });
r = await chamar("POST", "/resgates", { token: tokenDemo, corpo: { recompensa_id: 9 }, idem: "R5" });
ok(r.s === 422 && r.j.erro === "saldo_insuficiente", "resgate: saldo insuficiente → 422 (e o saldo nunca fica negativo)");
r = await chamar("GET", "/me/coins", { token: tokenDemo });
ok(r.j.balance >= 0, "saldo nunca negativo (" + r.j.balance + ")");

// painel e exportação da empresa
r = await chamar("GET", "/empresas/me/dashboard", { token: tokenEmp });
const dash = r.j.data;
ok(r.s === 200 && dash.serie.labels.length === 6 && dash.serie.valores.length === 6 && dash.ecopontos.length === 8 && dash.totais.ativos === 7, "dashboard: 6 meses, 8 ecopontos da empresa (7 ativos)");
ok(dash.categorias.reduce((s, c) => s + c.percentual, 0) === 100, "dashboard: percentuais somam 100");
ok(/^(Hoje|Ontem|Há \d+ dias)/.test(dash.ecopontos[0].ultima_atividade) && dash.ecopontos[0].ultima_atividade.startsWith("Hoje"), "dashboard: última atividade reflete a leitura feita agora");
r = await chamar("GET", "/empresas/me/leituras?periodo=mes&ecoponto_id=1", { token: tokenEmp });
ok(r.s === 200 && r.j.data[0].ecoponto_codigo === "ECO-01" && !JSON.stringify(r.j).match(/pessoa|cpf|e-mail|email/i), "leituras: filtro por ecoponto, sem dado pessoal");
ok(r.j.data.some((x) => x.resultado_rotulo === "Creditado") && r.j.data.some((x) => x.resultado_rotulo === "Código inválido"), "leituras: inclui resultados creditados e não creditados");
r = await chamar("GET", "/empresas/me/leituras?periodo=tudo&por_pagina=100&pagina=2", { token: tokenEmp });
ok(r.s === 200 && r.j.meta.pagina === 2 && r.j.meta.total > 100, "leituras: histórico longo paginado");
r = await chamar("GET", "/empresas/me/leituras?ecoponto_id=9", { token: tokenEmp });
ok(r.s === 403, "leituras: ecoponto de outra empresa → 403");
r = await chamar("GET", "/empresas/me/dashboard", { token: tokenDemo });
ok(r.s === 403, "dashboard: pessoa comum → 403");

// master
const tokenMaster = await entrarPessoa("MASTER", "Master123", RESP_MASTER);
r = await chamar("GET", "/admin/pessoas?busca=ana", { token: tokenMaster });
ok(r.s === 200 && r.j.data.length >= 1 && /^\*\*\*\.\d{3}\.\d{3}-\*\*$/.test(r.j.data[0].cpf_mascarado) && !r.j.data.some((p) => p.email === "master@ecotech.com"), "admin: busca por parte do nome, CPF mascarado, sem contas master");
r = await chamar("GET", "/admin/logs-autenticacao?tipo=nome&termo=maria", { token: tokenMaster });
ok(r.s === 200 && r.j.data.length >= 1 && r.j.data.every((x) => /maria/i.test(x.nome)), "logs: filtro por nome");
r = await chamar("GET", "/admin/logs-autenticacao", { token: tokenMaster });
const datas = r.j.data.map((x) => x.data_formatada);
ok(r.j.data.some((x) => x.sucesso === false) && r.j.data[0].metodo_2fa, "logs: inclui falhas e o 2FA utilizado");
r = await chamar("GET", "/admin/logs-autenticacao?tipo=cpf&termo=11144477735", { token: tokenMaster });
ok(r.s === 200 && r.j.data.length >= 1, "logs: filtro por CPF");
r = await chamar("PUT", "/me/senha", { token: tokenMaster, corpo: { senha_atual: "Master123", nova_senha: "Nova12345" } });
ok(r.s === 403, "master não altera senha por /me/senha → 403");
const alvo = (await chamar("GET", "/admin/pessoas?busca=juliana", { token: tokenMaster })).j.data[0];
r = await chamar("DELETE", `/admin/pessoas/${alvo.id}`, { token: tokenMaster });
const dep2 = await chamar("GET", "/admin/pessoas?busca=juliana", { token: tokenMaster });
ok(r.s === 204 && dep2.j.data.length === 0, "admin: excluir anonimiza e some da lista");

// senha e recuperação
r = await chamar("PUT", "/me/senha", { token: tokenDemo, corpo: { senha_atual: "errada", nova_senha: "Nova12345" } });
ok(r.s === 422 && r.j.message === "Senha atual incorreta.", "alterar senha: atual errada → 422");
r = await chamar("PUT", "/me/senha", { token: tokenDemo, corpo: { senha_atual: "Demo1234", nova_senha: "fraca" } });
ok(r.s === 422 && r.j.campos.nova_senha, "alterar senha: senha fraca → 422 com campos");
const f1 = await chamar("POST", "/auth/esqueci-senha", { corpo: { email: "demo@ecotech.com" } });
const f2 = await chamar("POST", "/auth/esqueci-senha", { corpo: { email: "naoexiste@ex.com" } });
const f3 = await chamar("POST", "/auth/esqueci-senha", { corpo: { email: "naoexiste@ex.com" } });
ok(f1.j.desafio_id && f2.j.desafio_id && f2.j.pergunta === f3.j.pergunta, "esqueci-senha: e-mail inexistente recebe desafio falso (mesma pergunta sempre)");
let fx;
for (let i = 0; i < 3; i++) fx = await chamar("POST", "/auth/esqueci-senha/verificar", { corpo: { desafio_id: f2.j.desafio_id, resposta: "qualquer" } });
ok(fx.s === 423, "esqueci-senha: desafio falso falha como o verdadeiro");
const v = await chamar("POST", "/auth/esqueci-senha/verificar", { corpo: { desafio_id: f1.j.desafio_id, resposta: RESP_DEMO[f1.j.pergunta_tipo] } });
ok(v.s === 200 && v.j.token, "esqueci-senha: resposta certa devolve token de reset");
r = await chamar("POST", "/auth/redefinir-senha", { corpo: { token: v.j.token, nova_senha: "Nova12345" } });
ok(r.s === 200, "redefinir-senha: ok");
r = await chamar("POST", "/auth/login", { corpo: { login: "DEMOUS", senha: "Nova12345" } });
ok(r.s === 200 && r.j.status === "2fa", "redefinir-senha: login com a senha nova funciona");

// perfil: editar e excluir
r = await chamar("PUT", "/me", { token: tokenDemo, corpo: { nome: "Maria Eduarda Souza Editada", email: "demo@ecotech.com", avatar_url: "https://exemplo.com/a.png" } });
ok(r.s === 200 && r.j.data.nome === "Maria Eduarda Souza Editada" && r.j.data.avatar === "https://exemplo.com/a.png", "me: PUT atualiza nome e avatar");
const tokenCarlos = await entrarPessoa("CARLOS", "Carlos123", { nome_mae: "Lúcia Ferreira", nascimento: "22/07/1988", cep: "22041001" });
r = await chamar("DELETE", "/me", { token: tokenCarlos });
const apos = await chamar("GET", "/me", { token: tokenCarlos });
ok(r.s === 204 && apos.s === 401, "me: DELETE anonimiza e derruba a sessão");
r = await chamar("POST", "/auth/logout", { token: tokenDemo });
const apos2 = await chamar("GET", "/me", { token: tokenDemo });
ok(r.s === 204 && apos2.s === 401, "logout: revoga o token");
r = await chamar("GET", "/rota-que-nao-existe");
ok(r.s === 404 && r.j.erro && r.j.message, "rota inexistente: 404 em JSON");
r = await chamar("POST", "/auth/google", { corpo: { credential: "x" } });
ok(r.s === 501 && /demonstração/.test(r.j.message), "Google: indisponível na demonstração, com mensagem clara");

console.log(`\n${passou} ok, ${falhou} falhas`);
srv.close();
process.exit(falhou ? 1 : 0);
