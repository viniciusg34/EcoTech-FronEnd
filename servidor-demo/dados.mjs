// Dados simulados da demonstração (em memória). Nada aqui é dado real.
import crypto from "node:crypto";

export const sha = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");
export const hashSenha = (senha, sal) => sha(`${sal}:${senha}`);

/* ── validadores usados pela API ── */
export function cpfValido(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

function dvCnpj(base) {
  const pesos = (n) => (n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const calc = (digs) => {
    const p = pesos(digs.length);
    const r = digs.reduce((s, n, i) => s + n * p[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d = base.split("").map(Number);
  d.push(calc(d));
  d.push(calc(d));
  return d.join("");
}
export const gerarCnpj = (base8) => dvCnpj(`${base8}0001`);
export function cnpjValido(cnpj) {
  const d = String(cnpj || "").replace(/\D/g, "");
  return d.length === 14 && !/^(\d)\1{13}$/.test(d) && dvCnpj(d.slice(0, 12)) === d;
}

export function eanValido(code) {
  const d = String(code || "");
  if (!/^\d+$/.test(d) || ![8, 12, 13].includes(d.length)) return false;
  const nums = d.split("").map(Number);
  const dv = nums.pop();
  const soma = nums.reverse().reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === dv;
}

export const senhaForte = (s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && String(s).length >= 8;
export const normalizar = (t) =>
  String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── banco ── */
export function criarBanco({ agora = () => Date.now(), senhaMaster = "Master123" } = {}) {
  const rnd = mulberry32(2026);
  const sequencias = {};
  const prox = (n) => (sequencias[n] = (sequencias[n] || 0) + 1);
  const DIA = 86400000;

  const categorias = [
    ["plastico", "Plástico", "#ef5350", "🧴", 12, "kg"],
    ["papel", "Papel", "#66bb6a", "📄", 8, "kg"],
    ["metal", "Metal", "#f9a825", "🥫", 20, "kg"],
    ["vidro", "Vidro", "#42a5f5", "🍾", 6, "kg"],
    ["eletronicos", "Eletrônicos", "#ab47bc", "🔋", 25, "un"],
    ["madeira", "Madeira", "#8d6e63", "🪵", 5, "kg"],
  ].map(([chave, rotulo, cor, icone, coins, unidade], i) => ({ id: i + 1, chave, rotulo, cor_hex: cor, icone, coins_por_unidade: coins, unidade, ordem: i + 1 }));
  const cat = (chave) => categorias.find((c) => c.chave === chave);

  const niveis = [
    { id: 1, nome: "Iniciante Verde", min: 0 },
    { id: 2, nome: "Reciclador Prata", min: 500 },
    { id: 3, nome: "Guardião Verde", min: 1500 },
    { id: 4, nome: "Mestre Eco", min: 3000 },
  ];

  const empresas = [
    ["EcoRio Reciclagem", "EcoRio Reciclagem Ltda", "empresa@ecotech.com", "Rua da Assembleia, 10 - Centro, Rio de Janeiro", "11222333"],
    ["Costa Verde Sustentável", "Costa Verde Sustentável S.A.", "costaverde@ecotech.com", "Av. Raul Pompeia, 50 - Angra dos Reis", "12345678"],
    ["Niterói Recicla", "Niterói Recicla ME", "niteroi@ecotech.com", "Rua Moreira César, 200 - Icaraí, Niterói", "98765432"],
  ].map(([nome, razao, email, endereco, base], i) => {
    const sal = `e${i}`;
    return { id: i + 1, nome_empresa: nome, razao_social: razao, email, endereco, cnpj: gerarCnpj(base), status: "ativa", sal, senhaHash: hashSenha("Empresa123", sal) };
  });

  // [codigo, nome, endereco, cidade, uf, lat, lng, categorias, status, empresaId]
  const pontos = [
    ["ECO-01", "Ecoponto Centro", "Rua da Assembleia, 10", "Rio de Janeiro", "RJ", -22.9068, -43.1729, ["plastico", "papel", "metal"], "ativo", 1],
    ["ECO-02", "Ecoponto Lapa", "Rua Riachuelo, 120", "Rio de Janeiro", "RJ", -22.9133, -43.1805, ["vidro", "metal"], "ativo", 1],
    ["ECO-03", "Ecoponto Botafogo", "Rua Voluntários da Pátria, 300", "Rio de Janeiro", "RJ", -22.9519, -43.1858, ["plastico", "papel", "vidro"], "ativo", 1],
    ["ECO-04", "Ecoponto Copacabana", "Av. Nossa Senhora de Copacabana, 700", "Rio de Janeiro", "RJ", -22.9711, -43.1822, ["plastico", "metal", "eletronicos"], "ativo", 1],
    ["ECO-05", "Ecoponto Ipanema", "Rua Visconde de Pirajá, 450", "Rio de Janeiro", "RJ", -22.9838, -43.2096, ["papel", "vidro"], "ativo", 1],
    ["ECO-06", "Ecoponto Tijuca", "Rua Conde de Bonfim, 500", "Rio de Janeiro", "RJ", -22.9249, -43.2326, ["plastico", "papel", "metal", "vidro"], "ativo", 1],
    ["ECO-07", "Ecoponto São Cristóvão", "Rua Figueira de Melo, 80", "Rio de Janeiro", "RJ", -22.8969, -43.221, ["metal", "madeira"], "manutencao", 1],
    ["ECO-08", "Ecoponto Méier", "Rua Dias da Cruz, 220", "Rio de Janeiro", "RJ", -22.9023, -43.2786, ["plastico", "papel", "eletronicos"], "ativo", 1],
    ["ECO-09", "Ecoponto Madureira", "Estrada do Portela, 150", "Rio de Janeiro", "RJ", -22.8736, -43.3375, ["plastico", "metal", "vidro"], "ativo", 3],
    ["ECO-10", "Ecoponto Jacarepaguá", "Estrada dos Bandeirantes, 1200", "Rio de Janeiro", "RJ", -22.936, -43.355, ["papel", "madeira"], "ativo", 3],
    ["ECO-11", "Ecoponto Barra da Tijuca", "Av. das Américas, 3000", "Rio de Janeiro", "RJ", -23.0004, -43.3659, ["plastico", "papel", "vidro", "eletronicos"], "ativo", 3],
    ["ECO-12", "Ecoponto Recreio", "Av. Tim Maia, 800", "Rio de Janeiro", "RJ", -23.0186, -43.462, ["plastico", "metal"], "ativo", 3],
    ["ECO-13", "Ecoponto Campo Grande", "Estrada do Mendanha, 400", "Rio de Janeiro", "RJ", -22.9034, -43.5617, ["plastico", "papel", "metal", "vidro"], "ativo", 3],
    ["ECO-14", "Ecoponto Bangu", "Rua Fonseca, 250", "Rio de Janeiro", "RJ", -22.879, -43.465, ["papel", "plastico"], "ativo", 3],
    ["ECO-15", "Ecoponto Santa Cruz", "Av. João XXIII, 600", "Rio de Janeiro", "RJ", -22.919, -43.685, ["madeira", "metal"], "inativo", 3],
    ["ECO-16", "Ecoponto Icaraí", "Rua Moreira César, 200", "Niterói", "RJ", -22.9052, -43.1105, ["plastico", "papel", "vidro"], "ativo", 3],
    ["ECO-17", "Ecoponto Itaguaí", "Av. Beira Mar, 90", "Itaguaí", "RJ", -22.8522, -43.7753, ["plastico", "metal"], "ativo", 2],
    ["ECO-18", "Ecoponto Mangaratiba", "Rua Capitão Oliveira, 30", "Mangaratiba", "RJ", -22.9597, -44.0407, ["plastico", "vidro", "papel"], "ativo", 2],
    ["ECO-19", "Ecoponto Angra Centro", "Av. Raul Pompeia, 50", "Angra dos Reis", "RJ", -23.0067, -44.3182, ["plastico", "papel", "metal", "vidro"], "ativo", 2],
    ["ECO-20", "Ecoponto Ilha Grande", "Vila do Abraão, s/n", "Angra dos Reis", "RJ", -23.1432, -44.1707, ["plastico", "vidro"], "ativo", 2],
    ["ECO-21", "Ecoponto Paraty Centro", "Rua da Lapa, 15", "Paraty", "RJ", -23.2178, -44.7131, ["plastico", "papel", "vidro"], "ativo", 2],
    ["ECO-22", "Ecoponto Trindade", "Estrada Paraty-Cunha, km 1", "Paraty", "RJ", -23.3629, -44.7251, ["plastico", "madeira"], "manutencao", 2],
  ];
  const ecopontos = pontos.map(([codigo, nome, endereco, cidade, estado, lat, lng, cats, status, empresaId], i) => ({
    id: i + 1, empresaId, codigo, nome, endereco, cidade, estado, lat, lng, status, categorias: cats,
    descricao: `Coleta de ${cats.map((c) => cat(c).rotulo.toLowerCase()).join(", ")}`,
    segredoQr: crypto.randomBytes(32).toString("hex"),
  }));

  const produtos = [
    ["7896004004778", "Garrafa PET 500ml", "plastico", 30, 0.03],
    ["7891234567895", "Lata de Alumínio 350ml", "metal", 40, 0.015],
    ["7896666000019", "Caixa de Papelão", "papel", 20, 0.2],
    ["7899000001239", "Vidro de Conserva", "vidro", 35, 0.25],
    ["7891910000197", "Pilha Alcalina AA", "eletronicos", 80, 0.025],
    ["7896000000002", "Embalagem Tetra Pak", "papel", 25, 0.03],
  ].map(([codigo, nome, c, coins, peso]) => ({ codigo, nome, categoriaId: cat(c).id, coins, peso_kg: peso }));

  const recompensas = [
    ["food", "🍔", "Cupom McDonald's", "20% OFF em combos", 200],
    ["food", "☕", "Café Grátis", "Um café em padarias parceiras", 80],
    ["food", "🥤", "Eco Garrafa", "Garrafa reutilizável EcoTech", 120],
    ["transport", "🚇", "Passe Metrô Rio", "Uma viagem no Metrô Rio", 150],
    ["transport", "🚲", "Bike Itaú 1h", "1 hora de bicicleta compartilhada", 90],
    ["health", "🌱", "Kit Sementes", "Sementes para sua horta", 100],
    ["health", "💊", "Desconto Farmácia 15%", "15% de desconto em farmácias parceiras", 120],
    ["shop", "👜", "Bolsa Ecotech", "Ecobag exclusiva", 180],
    ["shop", "🛍️", "Vale Compras R$30", "Vale em lojas parceiras", 300],
    ["shop", "👕", "Camiseta Sustentável", "Algodão orgânico", 220],
    ["leisure", "🎬", "Ingresso de Cinema", "Um ingresso em cinemas parceiros", 250],
  ].map(([categoria, icone, nome, descricao, custo], i) => ({ id: i + 1, categoria, icone, nome, descricao, custo_coins: custo, estoque: null, ativa: true, ordem: i + 1 }));

  /* ── pessoas ── */
  const pessoas = [];
  const novaPessoa = (d) => {
    const sal = `p${pessoas.length + 1}`;
    const p = {
      id: pessoas.length + 1, avatarUrl: null, saldo: 0, nivelVistoId: 1, preferenciaNotificacao: "todas", ativo: true,
      anonimizadoEm: null, perfil: "comum", sexo: "nao_informar", telefoneCelular: "21999990000", telefoneFixo: "2133330000",
      logradouro: "Rua da Assembleia", numero: "10", bairro: "Centro", cidade: "Rio de Janeiro", uf: "RJ", cep: "20040020", ...d, sal,
    };
    p.senhaHash = hashSenha(d.senha, sal);
    delete p.senha;
    pessoas.push(p);
    return p;
  };
  novaPessoa({ nome: "Administrador Master EcoTech", email: "master@ecotech.com", cpf: "52998224725", login: "MASTER", senha: senhaMaster, perfil: "master", nomeMae: "Maria Master", nascimento: "1980-01-01" });
  const demo = novaPessoa({ nome: "Maria Eduarda Souza Demonstração", email: "demo@ecotech.com", cpf: "11144477735", login: "DEMOUS", senha: "Demo1234", nomeMae: "Ana Souza", nascimento: "1995-03-14", sexo: "feminino" });
  novaPessoa({ nome: "Carlos Eduardo Ferreira Lima", email: "carlos@exemplo.com", cpf: "39053344705", login: "CARLOS", senha: "Carlos123", nomeMae: "Lúcia Ferreira", nascimento: "1988-07-22", sexo: "masculino", cep: "22041001", cidade: "Rio de Janeiro" });
  novaPessoa({ nome: "Juliana Martins de Souza", email: "juliana@exemplo.com", cpf: "12345678909", login: "JULIAN", senha: "Juliana123", nomeMae: "Rosa Martins", nascimento: "1999-11-05", sexo: "feminino", cep: "23010000" });

  /* ── ledger, coletas e leituras iniciais ── */
  const movimentos = [];
  const coletas = [];
  const leituras = [];
  const resgates = [];
  const logs = [];

  function lancar(pessoa, valor, { tipo, titulo, subtitulo = null, icone = null, origemTipo = null, origemId = null, em }) {
    pessoa.saldo += valor;
    const m = { id: prox("mov"), pessoaId: pessoa.id, tipo, valor, saldoApos: pessoa.saldo, titulo, subtitulo, icone, origemTipo, origemId, em: em ?? agora() };
    movimentos.push(m);
    return m;
  }

  const t0 = agora();
  const antes = (dias, hora = 10) => {
    const d = new Date(t0 - dias * DIA);
    d.setHours(hora, Math.floor(rnd() * 59), 0, 0);
    return d.getTime();
  };
  lancar(demo, 1000, { tipo: "ajuste", titulo: "Saldo inicial de demonstração", icone: "🎁", em: antes(40) });
  const exemplos = [
    [30, 3, "checkin", "Check-in em Ecoponto Centro", "ECO-01", "📍", 50],
    [29, 3, "leitura", "Garrafa PET 500ml", "ECO-01", "🧴", 30],
    [20, 2, "leitura", "Lata de Alumínio 350ml", "ECO-02", "🥫", 40],
    [14, 5, "resgate", "Café Grátis", null, "☕", -80],
    [9, 4, "leitura", "Pilha Alcalina AA", "ECO-04", "🔋", 80],
    [3, 2, "checkin", "Check-in em Ecoponto Botafogo", "ECO-03", "📍", 50],
    [2, 6, "leitura", "Caixa de Papelão", "ECO-06", "📄", 20],
    [1, 5, "leitura", "Vidro de Conserva", "ECO-05", "🍾", 35],
  ];
  for (const [dias, , tipo, titulo, sub, icone, valor] of exemplos) lancar(demo, valor, { tipo, titulo, subtitulo: sub, icone, em: antes(dias, 14) });
  // acerta o saldo para 1250 (o que o restante soma é ajustado no "saldo inicial")
  const ajuste = 1250 - demo.saldo;
  movimentos[0].valor += ajuste;
  movimentos.forEach((m) => { if (m.pessoaId === demo.id) m.saldoApos += ajuste; });
  demo.saldo = 1250;
  demo.nivelVistoId = 2;

  // coletas dos últimos 6 meses por ecoponto (dados do painel e da exportação)
  const ehAtivo = (e) => e.status !== "inativo";
  for (const e of ecopontos.filter(ehAtivo)) {
    for (let mesAtras = 5; mesAtras >= 0; mesAtras--) {
      const n = 4 + Math.floor(rnd() * 6) + (5 - mesAtras); // cresce ao longo do tempo
      for (let k = 0; k < n; k++) {
        const dia = mesAtras === 0 ? Math.floor(rnd() * 20) : mesAtras * 30 + Math.floor(rnd() * 28);
        const c = cat(e.categorias[Math.floor(rnd() * e.categorias.length)]);
        const prod = produtos.filter((p) => p.categoriaId === c.id);
        const p = prod.length ? prod[Math.floor(rnd() * prod.length)] : null;
        const kg = Math.round((3 + rnd() * 22) * 10) / 10;
        const em = antes(dia, 8 + Math.floor(rnd() * 10));
        const id = prox("coleta");
        coletas.push({ id, ecopontoId: e.id, pessoaId: null, categoriaId: c.id, kg, coins: Math.round(kg * c.coins_por_unidade), tipo: "entrega", em });
        leituras.push({ id: prox("leitura"), ecopontoId: e.id, pessoaId: null, codigo: p ? p.codigo : "", produto: p ? p.nome : c.rotulo, categoria: c.rotulo, kg, coins: p ? p.coins : 0, resultado: rnd() < 0.9 ? "creditado" : rnd() < 0.5 ? "duplicado" : "nao_participa", em, coletaId: id });
      }
    }
  }
  for (const l of leituras) if (l.resultado !== "creditado") { l.kg = 0; l.coins = 0; }

  logs.push({ id: prox("log"), pessoaId: demo.id, identificador: demo.email, metodo: "Qual o nome da sua mãe?", sucesso: true, tentativa: 1, em: antes(1, 9) });
  logs.push({ id: prox("log"), pessoaId: 3, identificador: "carlos@exemplo.com", metodo: "Qual a data do seu nascimento?", sucesso: false, tentativa: 1, em: antes(2, 18) });
  logs.push({ id: prox("log"), pessoaId: 3, identificador: "carlos@exemplo.com", metodo: "Qual a data do seu nascimento?", sucesso: true, tentativa: 2, em: antes(2, 18) });
  logs.push({ id: prox("log"), pessoaId: 4, identificador: "juliana@exemplo.com", metodo: "Qual o CEP do seu endereço?", sucesso: true, tentativa: 1, em: antes(5, 11) });

  return {
    prox, categorias, cat, niveis, empresas, ecopontos, produtos, recompensas, pessoas, novaPessoa, movimentos, coletas, leituras, resgates, logs, lancar,
    desafios: new Map(), sessoes: new Map(), tokens: new Map(), resets: new Map(), idem: new Map(),
    config: { checkin_coins: 50, checkin_kg: 0.5, checkin_cooldown_min: 2, sessao_minutos: 10, duplicidade_horas: 24 },
  };
}
