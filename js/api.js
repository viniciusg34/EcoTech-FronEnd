"use strict";

/* ══════════════════════════════════════════════════════════
   api.js — Cliente único da API EcoTech.
   Substitui js/eco-session.js e js/eco-api.

   Carregue depois de js/config.js (e de js/ui-toast.js, se a
   página tiver toast próprio):
     <script src="js/config.js"></script>
     <script src="js/api.js"></script>

   Expõe:
     Api      get / post / put / patch / del, showError, uuid
     Session  save, clear, get, update, refresh
     Auth     login, verificar2fa, google, esqueciSenha, ...
   e, por compatibilidade com as páginas atuais:
     getSession(), clearSession(), requireAuth(), initHeader()

   Contrato de erro da API: { erro, message, campos? }.
   O front só mostra `message`; não monta texto de negócio.

   ⚠ Nomes de campos marcados com "CONTRATO" foram assumidos a
   partir do PDF do backend. Quando o openapi.yaml chegar,
   ajuste SÓ este arquivo.
══════════════════════════════════════════════════════════ */
(function (global) {
  var CFG = global.ECOTECH_CONFIG || {};
  var TIMEOUT_MS = 15000;

  var SESSION_KEY = "ecotech_session"; // { token, usuario }
  var PENDING_2FA_KEY = "ecotech_2fa"; // estado do fluxo 2FA (sessionStorage)
  var PENDING_CODIGO_KEY = "ecotech_codigo"; // código de 6 dígitos por e-mail em andamento (sessionStorage)
  var LOGIN_PAGE = "login.html";

  /* ════════════════════════════════════════════════════════
     Ambientes (local e servidor)
     js/config.js lista os ambientes e a ordem de preferência. O front
     sonda GET {BASE_URL}/saude: o primeiro que responder é usado, e se ele
     cair no meio do uso o front passa para o próximo. A escolha vale por
     aba (sessionStorage), porque cada ambiente tem o seu banco e as suas
     sessões. Um selo no canto da tela mostra onde o front está conectado
     e permite trocar à mão.
  ════════════════════════════════════════════════════════ */
  var AMBIENTES = CFG.AMBIENTES || (CFG.BASE_URL ? { api: { nome: "API", BASE_URL: CFG.BASE_URL } } : {});
  // Site aberto em localhost (ou arquivo)? Só então vale tentar uma API em localhost.
  // Num site publicado (ex.: Vercel) o navegador pode pedir permissão de "rede local"
  // ao sondar localhost, então esses ambientes ficam de fora (use ?ambiente=local para forçar).
  var PAGINA_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname || "");
  function ehLoopback(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
  }
  var ORDEM = (CFG.ORDEM || Object.keys(AMBIENTES)).filter(function (k) {
    var u = AMBIENTES[k] && AMBIENTES[k].BASE_URL;
    return u && !/SUA-API/.test(u) && (PAGINA_LOCAL || !ehLoopback(u));
  });
  var FORCADO_KEY = "ecotech_ambiente_forcado"; // escolha manual (selo ou ?ambiente=)
  var ESCOLHIDO_KEY = "ecotech_ambiente"; // ambiente em uso nesta aba
  var BASE_URL = "";
  var ambiente = { chave: null, nome: "", modo: null, ok: null };

  function semBarra(u) {
    return String(u || "").replace(/\/+$/, "");
  }

  /* GET {base}/saude: rede, tempo esgotado ou 5xx = fora do ar; qualquer
     outra resposta (inclusive 404, se o backend ainda não tem /saude) = no ar. */
  function sondar(chave) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 2500) : null;
    return fetch(semBarra(AMBIENTES[chave].BASE_URL) + "/saude", {
      headers: { Accept: "application/json" },
      signal: ctl ? ctl.signal : undefined,
    }).then(
      function (r) {
        if (t) clearTimeout(t);
        if (r.status >= 500) return { ok: false };
        return r.json().catch(function () { return {}; }).then(function (d) {
          return { ok: true, modo: d && d.modo === "demo" ? "demo" : "real" };
        });
      },
      function () {
        if (t) clearTimeout(t);
        return { ok: false };
      },
    );
  }

  function definir(chave, info) {
    BASE_URL = semBarra(AMBIENTES[chave].BASE_URL);
    ambiente = { chave: chave, nome: AMBIENTES[chave].nome || chave, modo: info.modo || null, ok: info.ok };
    try {
      sessionStorage.setItem(ESCOLHIDO_KEY, chave);
    } catch (_) {}
    if (location.protocol === "https:" && BASE_URL.indexOf("http://") === 0 && !/\/\/(localhost|127\.0\.0\.1)/.test(BASE_URL)) {
      console.error("[api] " + ambiente.nome + " usa HTTP e a página usa HTTPS: o navegador vai bloquear as chamadas.");
    }
    atualizarSelo();
  }

  /* Primeiro candidato no ar, na ordem dada */
  function primeiroNoAr(chaves) {
    return chaves.reduce(function (p, chave) {
      return p.then(function (achou) {
        if (achou) return achou;
        return sondar(chave).then(function (info) {
          return info.ok ? { chave: chave, info: info } : null;
        });
      });
    }, Promise.resolve(null));
  }

  var pronta = null;
  function resolverAmbiente() {
    if (pronta) return pronta;
    var param = null;
    try {
      param = new URLSearchParams(location.search).get("ambiente");
      if (param === "auto") sessionStorage.removeItem(FORCADO_KEY);
      else if (param && AMBIENTES[param]) sessionStorage.setItem(FORCADO_KEY, param);
    } catch (_) {}
    var forcado = null;
    var escolhido = null;
    try {
      forcado = sessionStorage.getItem(FORCADO_KEY);
      escolhido = sessionStorage.getItem(ESCOLHIDO_KEY);
    } catch (_) {}
    var candidatos = forcado && AMBIENTES[forcado] ? [forcado] : ORDEM;

    if (!candidatos.length) {
      console.error("[api] nenhum ambiente configurado em js/config.js");
      pronta = Promise.resolve();
      return pronta;
    }

    // Um só candidato, ou ambiente já escolhido nesta aba: não espera a sondagem
    var rapido = candidatos.length === 1 ? candidatos[0] : escolhido && candidatos.indexOf(escolhido) >= 0 ? escolhido : null;
    if (rapido) {
      definir(rapido, { ok: true });
      sondar(rapido).then(function (info) {
        if (ambiente.chave !== rapido) return; // um pedido já falhou e o front já trocou de ambiente
        definir(rapido, info);
        if (!info.ok) tentarTroca();
      });
      pronta = Promise.resolve();
      return pronta;
    }

    pronta = primeiroNoAr(candidatos).then(function (achou) {
      if (achou) definir(achou.chave, achou.info);
      else definir(candidatos[0], { ok: false });
    });
    return pronta;
  }

  /* O ambiente atual caiu: passa para outro que esteja no ar. Não troca
     sozinho se a pessoa escolheu o ambiente à mão.
     • Quem estava logado perde a sessão (o outro ambiente tem outro banco).
       Numa tela que exige login, vai para o login.
     • Numa tela pública (início, sobre nós, afilie-se, login, cadastro...)
       NUNCA manda para o login: os pedidos GET que falharam são repetidos
       no novo ambiente e a página segue normal (ver enviar()).
     Vários pedidos falhando ao mesmo tempo esperam a MESMA troca. */
  var troca = null;
  function tentarTroca() {
    var forcado = null;
    try {
      forcado = sessionStorage.getItem(FORCADO_KEY);
    } catch (_) {}
    if (forcado || ORDEM.length < 2) return Promise.resolve(false);
    if (troca) return troca;
    var outros = ORDEM.filter(function (k) {
      return k !== ambiente.chave;
    });
    troca = primeiroNoAr(outros).then(function (achou) {
      troca = null;
      if (!achou) return false;
      var antigo = ambiente.nome;
      var tinhaSessao = !!readRaw();
      definir(achou.chave, achou.info);
      if (!tinhaSessao) {
        toast(antigo + " indisponível. Conectado a " + ambiente.nome + ".");
        return true;
      }
      clearSession();
      if (paginaPublica()) {
        // tela aberta a todos: só atualiza o header (sem conta) recarregando
        toast(antigo + " indisponível. Usando " + ambiente.nome + ". Entre novamente quando quiser.");
        trocandoDePagina = true;
        setTimeout(function () {
          location.reload();
        }, 1800);
      } else {
        toast(antigo + " indisponível. Usando " + ambiente.nome + ". Entre novamente.");
        trocandoDePagina = true;
        setTimeout(goToLogin, 1800);
      }
      return true;
    });
    return troca;
  }

  /* Escolha manual pelo selo: chave = nome do ambiente, ou null = automático */
  function escolherAmbiente(chave) {
    try {
      if (chave) sessionStorage.setItem(FORCADO_KEY, chave);
      else sessionStorage.removeItem(FORCADO_KEY);
      sessionStorage.removeItem(ESCOLHIDO_KEY);
    } catch (_) {}
    clearSession();
    location.reload();
  }

  /* ════════════════════════════════════════════════════════
     Utilidades
  ════════════════════════════════════════════════════════ */
  function escapeHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /* Toast: usa o showToast da página; se não houver, cria um mínimo. */
  function toast(msg) {
    if (typeof global.showToast === "function") {
      global.showToast(msg);
      return;
    }
    var el = document.getElementById("eco-api-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "eco-api-toast";
      el.setAttribute("role", "status");
      el.style.cssText =
        "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);" +
        "background:#1a2e1b;color:#fff;padding:12px 18px;border-radius:12px;" +
        "font:600 0.875rem 'Plus Jakarta Sans','Poppins',sans-serif;" +
        "z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw;";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.display = "none";
    }, 2800);
  }

  /* ════════════════════════════════════════════════════════
     Sessão — só o token + identidade mínima para o header
     (nome, e-mail, avatar, tipo, perfil). Saldo e qualquer
     dado de negócio vêm sempre da API.
  ════════════════════════════════════════════════════════ */
  function readStore(storage) {
    try {
      return JSON.parse(storage.getItem(SESSION_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function readRaw() {
    var s = readStore(sessionStorage) || readStore(localStorage);
    return s && s.token && s.usuario ? s : null;
  }

  function writeRaw(raw, lembrar) {
    var json = JSON.stringify(raw);
    sessionStorage.setItem(SESSION_KEY, json);
    if (lembrar) localStorage.setItem(SESSION_KEY, json);
    else localStorage.removeItem(SESSION_KEY);
  }

  /* Sessão achatada: { id, nome, email, tipo, perfil, avatar, token } */
  function getSession() {
    var raw = readRaw();
    return raw ? Object.assign({}, raw.usuario, { token: raw.token }) : null;
  }

  function sessionToken() {
    var raw = readRaw();
    return raw ? raw.token : null;
  }

  function identidade(u) {
    u = u || {};
    var o = {
      id: u.id,
      nome: u.nome,
      email: u.email,
      tipo: u.tipo || "pessoa",
      perfil: u.perfil || "comum",
      avatar: u.avatar || null,
    };
    if (u.cnpj) o.cnpj = u.cnpj;
    return o;
  }

  /* CONTRATO: resposta de sucesso = { token, usuario:{id,nome,email,tipo,perfil,avatar,coins} } */
  function saveSession(resp, lembrar) {
    writeRaw({ token: resp.token, usuario: identidade(resp.usuario) }, !!lembrar);
  }

  /* Atualiza campos de identidade (ex.: nome/avatar após editar o perfil). */
  function updateSession(parcial) {
    var raw = readRaw();
    if (!raw) return;
    var lembrar = !!readStore(localStorage);
    raw.usuario = identidade(Object.assign({}, raw.usuario, parcial));
    writeRaw(raw, lembrar);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PENDING_2FA_KEY);
    sessionStorage.removeItem(PENDING_CODIGO_KEY);
    sessionStorage.removeItem("ecotech_sessao_ecoponto");
    // restos da versão anterior (MockAPI)
    localStorage.removeItem("ecotech_user_id");
    sessionStorage.removeItem("ecotech_pending_2fa");
  }

  /* Erros inesperados (acesso negado, falha do servidor) levam à tela de erro. */
  function goToError(codigo, mensagem) {
    if (location.pathname.split("/").pop() === "error_page.html") return;
    var q = "?codigo=" + encodeURIComponent(codigo) + "&mensagem=" + encodeURIComponent(mensagem || "");
    var atual = location.pathname.split("/").pop();
    if (/^[\w-]+\.html$/.test(atual)) q += "&voltar=" + encodeURIComponent(atual);
    location.href = "error_page.html" + q;
  }

  /* Telas abertas a todos. Nelas o site NUNCA manda para o login sozinho
     (nem se o token venceu, nem se o ambiente da API mudou): quem não está
     logado vê a página normalmente. "" = raiz do site (abre a index). */
  var PAGINAS_PUBLICAS = [
    "index.html",
    "sobre_nos.html",
    "afilie_se.html",
    "login.html",
    "cadastro.html",
    "cadastro_empresarial.html",
    "esqueci_senha.html",
    "codigo.html",
    "error_page.html",
    "404.html",
  ];
  function paginaPublica() {
    return PAGINAS_PUBLICAS.indexOf(paginaAtual()) >= 0;
  }

  function goToLogin() {
    if (paginaPublica()) return; // página pública não é bloqueada pelo login
    location.replace(LOGIN_PAGE);
  }

  /* Exige login. Sem sessão, vai para o login. */
  function requireAuth() {
    var s = getSession();
    if (!s || !s.id) {
      goToLogin();
      throw new Error("Não autenticado.");
    }
    return s;
  }

  /* ════════════════════════════════════════════════════════
     Cliente HTTP
  ════════════════════════════════════════════════════════ */
  var MSG_PADRAO = {
    0: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
    401: "Sua sessão expirou. Entre novamente.",
    403: "Você não tem permissão para fazer isso.",
    404: "Não encontramos o que você procurava.",
    429: "Muitas tentativas. Aguarde um instante e tente novamente.",
    5: "O servidor está indisponível no momento. Tente novamente em instantes.",
  };

  function mensagemPadrao(status) {
    if (status >= 500) return MSG_PADRAO[5];
    return MSG_PADRAO[status] || "Algo deu errado. Tente novamente.";
  }

  function ApiError(status, data) {
    var e = new Error((data && data.message) || mensagemPadrao(status));
    e.name = "ApiError";
    e.status = status; // 0 = falha de rede / timeout
    e.erro = (data && data.erro) || null;
    e.campos = (data && data.campos) || null;
    e.data = data || null;
    e.toasted = false;
    return e;
  }

  function queryString(query) {
    if (!query) return "";
    var partes = [];
    Object.keys(query).forEach(function (k) {
      var v = query[k];
      if (v === undefined || v === null || v === "") return;
      partes.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    return partes.length ? "?" + partes.join("&") : "";
  }

  /* Pedidos em andamento. Avisa a página por eventos no document:
     "eco:api-ativo" (começou um) e "eco:api-ocioso" (não sobrou nenhum).
     O js/eco-skeleton.js usa isso para tirar o skeleton se a API falhar. */
  var pendentes = 0;
  function avisar(nome) {
    try {
      document.dispatchEvent(new CustomEvent(nome, { detail: { pendentes: pendentes } }));
    } catch (_) {}
  }
  function terminou() {
    pendentes = Math.max(0, pendentes - 1);
    if (!pendentes) setTimeout(function () { if (!pendentes) avisar("eco:api-ocioso"); }, 0);
  }

  /* opts: { query, body, auth:false, idempotencyKey, silent, headers, raw }
     raw:true devolve o corpo como texto (ex.: SVG do QR). */
  function request(method, path, opts) {
    pendentes++;
    avisar("eco:api-ativo");
    return resolverAmbiente()
      .then(function () {
        return enviar(method, path, opts);
      })
      .then(
        function (r) {
          terminou();
          return r;
        },
        function (e) {
          terminou();
          throw e;
        },
      );
  }

  var REPETIR = {}; // marca interna: "repita este GET no ambiente novo"

  function enviar(method, path, opts) {
    if (trocandoDePagina) return new Promise(function () {}); // indo para a tela certa da conta
    opts = opts || {};
    var chaveUsada = ambiente.chave;
    // Só GET é repetido (não muda nada no servidor), e no máximo uma vez
    var podeRepetir = method === "GET" && !opts._repetido;
    var token = opts.auth === false ? null : sessionToken();

    var headers = Object.assign({ Accept: "application/json" }, opts.headers);
    if (token) headers.Authorization = "Bearer " + token;
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

    var init = { method: method, headers: headers };
    if (opts.body !== undefined) {
      if (typeof FormData !== "undefined" && opts.body instanceof FormData) {
        init.body = opts.body;
      } else {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(opts.body);
      }
    }

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    if (controller) {
      init.signal = controller.signal;
      timer = setTimeout(function () {
        controller.abort();
      }, TIMEOUT_MS);
    }

    return fetch(BASE_URL + path + queryString(opts.query), init)
      .then(
        function (resp) {
          return resp.text().then(function (text) {
            var data = null;
            if (text) {
              try {
                data = JSON.parse(text);
              } catch (_) {
                data = null; // ex.: página HTML de erro do servidor
              }
            }
            return { resp: resp, data: data, text: text };
          });
        },
        function () {
          var err = ApiError(0, null); // rede, CORS, timeout
          // O front já trocou de ambiente enquanto este pedido estava no caminho
          if (podeRepetir && chaveUsada !== ambiente.chave) return REPETIR;
          ambiente.ok = false;
          atualizarSelo();
          if (opts.silent) {
            // silencioso não provoca troca, mas aproveita uma que já esteja acontecendo
            if (podeRepetir && troca) {
              return troca.then(function (trocou) {
                if (trocou) return REPETIR;
                throw err;
              });
            }
            throw err;
          }
          err.toasted = true;
          // sem rede com este ambiente: tenta o próximo antes de avisar
          return tentarTroca().then(function (trocou) {
            if (trocou && podeRepetir) return REPETIR; // GET: busca de novo no ambiente novo
            if (!trocou) toast(err.message);
            throw err;
          });
        },
      )
      .then(function (r) {
        if (r === REPETIR) return enviar(method, path, Object.assign({}, opts, { _repetido: true }));
        if (ambiente.ok === false) {
          ambiente.ok = true; // voltou a responder
          atualizarSelo();
        }
        if (r.resp.ok) return opts.raw ? r.text : r.data;

        var err = ApiError(r.resp.status, r.data);

        if (r.resp.status === 401 && token) {
          // token inválido/expirado/revogado: encerra a sessão
          clearSession();
          if (!opts.silent) {
            toast(err.message);
            err.toasted = true;
          }
          setTimeout(goToLogin, 900);
        } else if (
          (r.resp.status === 403 || r.resp.status >= 500) &&
          !opts.silent &&
          !(r.data && r.data.erro === "email_nao_enviado") // falha no envio do código: a tela mostra o aviso
        ) {
          // inesperado: mostra a tela de erro (as chamadas silenciosas, como
          // a checagem periódica de saldo, nunca redirecionam)
          err.toasted = true;
          goToError(r.resp.status, err.message);
        } else if (r.resp.status === 429 && !opts.silent) {
          toast(err.message);
          err.toasted = true;
        }
        throw err;
      })
      .then(
        function (ok) {
          if (timer) clearTimeout(timer);
          return ok;
        },
        function (e) {
          if (timer) clearTimeout(timer);
          throw e;
        },
      );
  }

  /* Primeira mensagem de validação de `campos` (aceita string ou lista). */
  function primeiroCampo(err) {
    if (!err || !err.campos) return null;
    var chaves = Object.keys(err.campos);
    if (!chaves.length) return null;
    var v = err.campos[chaves[0]];
    return Array.isArray(v) ? v[0] : v;
  }

  /* Mostra o erro como toast, sem repetir o que o cliente já mostrou. */
  function showError(err, fallback) {
    if (err && err.toasted) return;
    var msg =
      (err && err.name === "ApiError" && (err.message || primeiroCampo(err))) ||
      fallback ||
      "Algo deu errado. Tente novamente.";
    toast(msg);
    if (err) err.toasted = true;
  }

  /* Respostas de objeto vêm como o objeto ou como { data: {...} }
     (padrão dos API Resources do Laravel). */
  function unwrap(r) {
    if (r && !Array.isArray(r) && r.data && typeof r.data === "object" && !Array.isArray(r.data)) {
      return r.data;
    }
    return r;
  }

  /* Listas: devolve { itens, meta } para [..] ou { data:[..], meta, links }. */
  function lista(r) {
    if (Array.isArray(r)) return { itens: r, meta: null };
    return { itens: (r && Array.isArray(r.data) && r.data) || [], meta: (r && r.meta) || null };
  }

  var Api = {
    unwrap: unwrap,
    lista: lista,
    request: request,
    get: function (path, query, opts) {
      return request("GET", path, Object.assign({ query: query }, opts));
    },
    post: function (path, body, opts) {
      return request("POST", path, Object.assign({ body: body === undefined ? {} : body }, opts));
    },
    put: function (path, body, opts) {
      return request("PUT", path, Object.assign({ body: body === undefined ? {} : body }, opts));
    },
    patch: function (path, body, opts) {
      return request("PATCH", path, Object.assign({ body: body === undefined ? {} : body }, opts));
    },
    del: function (path, opts) {
      return request("DELETE", path, opts);
    },
    showError: showError,
    primeiroCampo: primeiroCampo,
    uuid: uuid,
    escapeHtml: escapeHtml,
  };

  /* ════════════════════════════════════════════════════════
     Autenticação
  ════════════════════════════════════════════════════════ */
  var Auth = {
    /* POST /auth/login
       CONTRATO: o PDF diz "{email ou login, senha}"; enviamos `email`
       quando o texto tem "@" e `login` caso contrário.
       `lembrar` (token de 30 dias) é proposta nossa: confirmar o nome do campo.
       Respostas: { status:'2fa', desafio_id, pergunta }  (pessoa)
                  { token, usuario }                      (empresa) */
    login: function (identificador, senha, lembrar) {
      var body = { senha: senha, lembrar: !!lembrar };
      if (identificador.indexOf("@") >= 0) body.email = identificador;
      else body.login = identificador;
      return Api.post("/auth/login", body, { auth: false });
    },

    /* POST /auth/2fa → { status:'codigo_email', desafio_id, email, ... }
       (versões antigas da API devolviam { token, usuario } direto) */
    verificar2fa: function (desafioId, resposta, lembrar) {
      return Api.post(
        "/auth/2fa",
        { desafio_id: desafioId, resposta: resposta, lembrar: !!lembrar },
        { auth: false },
      );
    },

    /* POST /auth/google → { token, usuario } ou
       { status:'cadastro_pendente', nome, email } */
    /* POST /auth/google — só usuário comum. Respostas: status "2fa" (conta existe)
       ou "cadastro_pendente" (ainda não tem conta). Empresa/master: 403. */
    google: function (credential, lembrar) {
      return Api.post("/auth/google", { credential: credential, lembrar: !!lembrar }, { auth: false, silent: true });
    },

    /* Recuperação de senha.
       CONTRATO (assumido): esqueci-senha devolve { desafio_id, pergunta }
       mesmo para e-mail inexistente (pergunta falsa), para não revelar
       se a conta existe. verificar devolve { token } de reset (10 min). */
    esqueciSenha: function (email) {
      return Api.post("/auth/esqueci-senha", { email: email }, { auth: false });
    },
    verificarRecuperacao: function (desafioId, codigo) {
      return Api.post(
        "/auth/esqueci-senha/verificar",
        { desafio_id: desafioId, codigo: codigo },
        { auth: false },
      );
    },

    /* ── Código de 6 dígitos por e-mail ──
       A API responde { status:'codigo_email', finalidade, desafio_id, email (mascarado),
       tentativas_restantes, expira_em, reenviar_em, email_enviado } em:
         finalidade 'confirmar_email' → cadastro (e login de quem ainda não confirmou)
         finalidade 'login'           → depois da pergunta (pessoa) ou da senha (empresa)
         finalidade 'recuperar_senha' → esqueci a senha (tratado no esqueci_senha.html) */

    /* POST /auth/codigo → { token, usuario } (última etapa do login) */
    verificarCodigo: function (desafioId, codigo, lembrar) {
      return Api.post(
        "/auth/codigo",
        { desafio_id: desafioId, codigo: codigo, lembrar: !!lembrar },
        { auth: false },
      );
    },
    /* POST /auth/confirmar-email → { message } (depois vai para o login) */
    confirmarEmail: function (desafioId, codigo) {
      return Api.post("/auth/confirmar-email", { desafio_id: desafioId, codigo: codigo }, { auth: false });
    },
    /* POST /auth/codigo/reenviar → mesmos dados, com prazos novos */
    reenviarCodigo: function (desafioId) {
      return Api.post("/auth/codigo/reenviar", { desafio_id: desafioId }, { auth: false, silent: true });
    },

    /* Guarda o desafio do código e abre codigo.html. Nada pessoal: só id,
       finalidade, e-mail mascarado e prazos. */
    irParaCodigo: function (r, lembrar) {
      sessionStorage.setItem(
        PENDING_CODIGO_KEY,
        JSON.stringify({
          desafio_id: r.desafio_id,
          finalidade: r.finalidade || "login",
          email: r.email || "",
          tentativas_restantes: r.tentativas_restantes,
          expira_em: r.expira_em || null,
          reenviar_em: r.reenviar_em || null,
          email_enviado: r.email_enviado !== false,
          lembrar: !!lembrar,
        }),
      );
      window.location.href = "codigo.html";
    },
    lerCodigo: function () {
      try {
        return JSON.parse(sessionStorage.getItem(PENDING_CODIGO_KEY) || "null");
      } catch (_) {
        return null;
      }
    },
    atualizarCodigo: function (parcial) {
      var atual = Auth.lerCodigo();
      if (!atual) return;
      sessionStorage.setItem(PENDING_CODIGO_KEY, JSON.stringify(Object.assign(atual, parcial)));
    },
    limparCodigo: function () {
      sessionStorage.removeItem(PENDING_CODIGO_KEY);
    },
    redefinirSenha: function (token, novaSenha) {
      return Api.post(
        "/auth/redefinir-senha",
        { token: token, nova_senha: novaSenha },
        { auth: false },
      );
    },

    /* PUT /me/senha (pessoa) ou PUT /empresas/me/senha (empresa) */
    alterarSenha: function (senhaAtual, novaSenha) {
      var s = getSession();
      var rota = s && s.tipo === "empresa" ? "/empresas/me/senha" : "/me/senha";
      return Api.put(rota, { senha_atual: senhaAtual, nova_senha: novaSenha });
    },

    /* GET /me */
    me: function () {
      return Api.get("/me");
    },

    /* POST /auth/logout (best-effort) e limpa a sessão local. */
    logout: function (atrasoMs) {
      var fim = function () {
        clearSession();
        setTimeout(function () {
          location.href = LOGIN_PAGE;
        }, atrasoMs || 0);
      };
      Api.post("/auth/logout", {}, { silent: true }).then(fim, fim);
    },

    /* Estado do 2FA entre login.html e 2fa.html. Só guarda o id do
       desafio e a pergunta; nenhum dado pessoal. */
    guardar2fa: function (estado) {
      sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(estado));
    },
    ler2fa: function () {
      try {
        return JSON.parse(sessionStorage.getItem(PENDING_2FA_KEY) || "null");
      } catch (_) {
        return null;
      }
    },
    limpar2fa: function () {
      sessionStorage.removeItem(PENDING_2FA_KEY);
    },

    /* Tipo da pergunta, para máscara do campo. Usa `pergunta_tipo`
       se a API enviar; senão deduz do texto (CONTRATO: pedir
       `pergunta_tipo` ao backend). */
    tipoPergunta: function (desafio) {
      if (!desafio) return null;
      if (desafio.pergunta_tipo) return desafio.pergunta_tipo;
      var t = String(desafio.pergunta || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (t.indexOf("mae") >= 0) return "nome_mae";
      if (t.indexOf("nascimento") >= 0) return "nascimento";
      if (t.indexOf("cep") >= 0) return "cep";
      return null;
    },

    /* Para onde ir depois de entrar (mesmos destinos de antes). */
    destinoPosLogin: function (usuario) {
      if (usuario && usuario.tipo === "empresa") return "empresa.html";
      if (usuario && usuario.perfil === "master") return "perfil.html";
      return "coleta.html";
    },
  };

  /* ════════════════════════════════════════════════════════
     Recursos (cadastro, CEP, perfil).
     CONTRATO: nomes dos campos de envio seguem as colunas do banco
     do PDF (snake_case, português). Dígitos sem máscara para CPF,
     CNPJ, CEP e telefones.
  ════════════════════════════════════════════════════════ */
  function digitos(v) {
    return String(v || "").replace(/\D/g, "");
  }

  var Pessoas = {
    /* POST /pessoas — 409 se e-mail, CPF ou login já existirem */
    cadastrar: function (d) {
      return Api.post(
        "/pessoas",
        {
          nome: d.nome,
          email: d.email,
          cpf: digitos(d.cpf),
          login: d.login,
          senha: d.senha,
          nome_mae: d.nomeMae,
          nascimento: d.nascimento, // aaaa-mm-dd
          sexo: d.sexo,
          telefone_celular: digitos(d.telefoneCelular),
          telefone_fixo: digitos(d.telefoneFixo),
          cep: digitos(d.cep),
          logradouro: d.logradouro,
          numero: d.numero,
          bairro: d.bairro,
          cidade: d.cidade,
          uf: d.uf,
          termos_aceitos: true,
        },
        { auth: false },
      );
    },
  };

  var Empresas = {
    /* POST /empresas */
    cadastrar: function (d) {
      return Api.post(
        "/empresas",
        {
          cnpj: digitos(d.cnpj),
          nome_empresa: d.nomeEmpresa,
          razao_social: d.razaoSocial,
          email: d.email,
          senha: d.senha,
          endereco: d.endereco,
        },
        { auth: false },
      );
    },
  };

  var Cep = {
    /* GET /cep/{cep} → { logradouro, bairro, cidade, uf } ou 404 */
    buscar: function (cep) {
      return Api.get("/cep/" + digitos(cep), null, { auth: false, silent: true });
    },
  };

  var Me = {
    obter: function () {
      return Api.get("/me").then(unwrap);
    },
    /* PUT /me — CONTRATO: { nome, email, avatar_url } */
    atualizar: function (campos) {
      return Api.put("/me", campos).then(unwrap);
    },
    /* DELETE /me — a API anonimiza a conta */
    excluir: function () {
      return Api.del("/me");
    },
    /* GET /me/coins → { balance, balance_formatado } */
    coins: function (opts) {
      return Api.get("/me/coins", null, opts).then(unwrap);
    },
    /* Saldo como texto pronto (a API formata; só cai em String se faltar). */
    saldoTexto: function (r) {
      if (!r) return "0";
      var f = r.balance_formatado || r.coins_formatado;
      return f != null ? String(f) : String(r.balance != null ? r.balance : r.coins || 0);
    },
    saldoNumero: function (r) {
      return Number(r && (r.balance != null ? r.balance : r.coins)) || 0;
    },
    /* GET /me/movimentos — linha do tempo já formatada e ordenada */
    movimentos: function (query) {
      return Api.get("/me/movimentos", query).then(lista);
    },
  };

  /* ════════════════════════════════════════════════════════
     Etapa 3: mapa, recompensas, ecoponto e leitor.
     CONTRATO (assumido do PDF; confirmar no openapi.yaml):
       GET /ecopontos        itens { id, codigo, nome, endereco, cidade,
                             estado, lat, lng, status, status_rotulo,
                             categorias:[{chave,rotulo,cor_hex}],
                             kg_coletado_formatado }
       GET /categorias       itens { chave, rotulo, cor_hex }
       GET /recompensas      itens { id, categoria, icone, nome, descricao,
                             custo_coins }
       POST /resgates        { recompensa_id } → { message, codigo_cupom }
       POST /ecopontos/conectar { qr } → { sessao_id, ecoponto:{codigo,nome},
                             expira_em, message }
       POST /checkins        { sessao_id } → { coinsAwarded, balance, message }
       GET /me/coins         → { balance, balance_formatado }
       GET /estatisticas     → { toneladas, membros, ecopontos } (a propor)
  ════════════════════════════════════════════════════════ */

  /* Junta todas as páginas de uma listagem paginada.
     CONTRATO: parâmetros `pagina` e `por_pagina`; meta.total. */
  function todos(path, query, maxPaginas) {
    var itens = [];
    var limite = maxPaginas || 20;
    function pagina(n) {
      var q = Object.assign({}, query, { pagina: n, por_pagina: 100 });
      return Api.get(path, q).then(lista).then(function (r) {
        itens = itens.concat(r.itens);
        var total = r.meta && r.meta.total;
        itens.total = total || itens.length; // quantas linhas existem no servidor
        if (!r.itens.length || !total || itens.length >= total || n >= limite) return itens;
        return pagina(n + 1);
      });
    }
    return pagina(1);
  }

  var Publico = {
    ecopontos: function (query) {
      return todos("/ecopontos", query);
    },
    categorias: function () {
      return todos("/categorias");
    },
    config: function () {
      return Api.get("/config", null, { silent: true }).then(unwrap);
    },
    estatisticas: function () {
      return Api.get("/estatisticas", null, { silent: true }).then(unwrap);
    },
  };

  var Recompensas = {
    listar: function (cat) {
      return todos("/recompensas", cat && cat !== "todos" ? { cat: cat } : null);
    },
    resgatar: function (id) {
      return Api.post("/resgates", { recompensa_id: id }, { idempotencyKey: uuid() }).then(unwrap);
    },
  };

  /* Sessão de ecoponto: a API é a dona; aqui fica só um atalho de
     navegação (para a tela do leitor abrir sem consultar a API). */
  var SESSAO_ECOPONTO_KEY = "ecotech_sessao_ecoponto";

  var Coleta = {
    conectar: function (qr) {
      return Api.post("/ecopontos/conectar", { qr: qr }).then(unwrap).then(function (r) {
        var sessaoId = r && (r.sessao_id || r.id);
        if (sessaoId) {
          sessionStorage.setItem(
            SESSAO_ECOPONTO_KEY,
            JSON.stringify({
              sessao_id: sessaoId,
              ecoponto: r.ecoponto || null,
              expira_em: r.expira_em || null,
            }),
          );
        }
        return r;
      });
    },
    checkin: function (sessaoId) {
      return Api.post("/checkins", { sessao_id: sessaoId }, { idempotencyKey: uuid() }).then(unwrap);
    },
    sessaoAtiva: function () {
      try {
        var s = JSON.parse(sessionStorage.getItem(SESSAO_ECOPONTO_KEY) || "null");
        if (!s || !s.sessao_id) return null;
        if (s.expira_em && Date.parse(s.expira_em) <= Date.now()) {
          sessionStorage.removeItem(SESSAO_ECOPONTO_KEY);
          return null;
        }
        return s;
      } catch (_) {
        return null;
      }
    },
    limparSessao: function () {
      sessionStorage.removeItem(SESSAO_ECOPONTO_KEY);
    },
  };

  /* ════════════════════════════════════════════════════════
     Etapa 4: empresa (painel, QR, leitor do Ecoponto).
     CONTRATO (assumido; ver BACKEND-ajustes-vindos-do-front.md):
       GET /empresas/me/dashboard
         { empresa:{ nome },
           totais:{ ecopontos, kg_formatado, validacoes_formatado, ativos,
                    variacao_kg_texto },
           serie:{ labels:[..6], valores:[..6], valores_formatados?:[..6],
                   total_formatado },
           categorias:[{ chave, rotulo, cor_hex, percentual }],
           ecopontos:[{ id, codigo, nome, endereco, status, status_rotulo,
                        categorias:[{ chave, rotulo, cor_hex }],
                        kg_mes_formatado, ultima_atividade }] }
       GET /ecopontos/{id}/qr.svg        (SVG assinado, gerado no servidor)
       GET /ecopontos/{id}/sessao-ativa  { sessao_id, pessoa:{ nome }, expira_em } | 404
       POST /ecopontos/{id}/leituras     { sessao_id, code } + Idempotency-Key
         → { coinsAwarded, message, produto?:{ nome } }
       GET /empresas/me/leituras?periodo=mes|3m|6m|tudo&ecoponto_id=
         itens { data_formatada, ecoponto_codigo, ecoponto_nome, produto,
                 categoria, kg_formatado, coins, resultado_rotulo }
         (histórico dos ecopontos da empresa; sem nenhum dado da pessoa)
  ════════════════════════════════════════════════════════ */
  var EmpresaApi = {
    /* GET /empresas/me — { nome_empresa, razao_social, email, endereco, cnpj_formatado,
       status_rotulo, total_ecopontos, membro_desde } */
    me: function () {
      return Api.get("/empresas/me").then(unwrap);
    },
    /* PUT /empresas/me — { nome_empresa?, razao_social?, email?, endereco? } */
    atualizar: function (dados) {
      return Api.put("/empresas/me", dados).then(unwrap);
    },
    dashboard: function () {
      return Api.get("/empresas/me/dashboard").then(unwrap);
    },
    qrSvg: function (ecopontoId) {
      return Api.request("GET", "/ecopontos/" + ecopontoId + "/qr.svg", { raw: true });
    },
    /* Texto assinado do QR (para colar na coleta se a câmera falhar) */
    qrPayload: function (ecopontoId) {
      return Api.get("/ecopontos/" + ecopontoId + "/qr", null, { silent: true }).then(unwrap);
    },
    /* 404 = ninguém conectado (não é erro para a tela) */
    sessaoAtiva: function (ecopontoId) {
      return Api.get("/ecopontos/" + ecopontoId + "/sessao-ativa", null, { silent: true }).then(unwrap);
    },
    /* Histórico de leituras para exportar. Até 200 páginas de 100 linhas;
       a lista devolvida traz `.total` com o que existe no servidor. */
    leituras: function (periodo, ecopontoId) {
      var q = { periodo: periodo || "mes" };
      if (ecopontoId) q.ecoponto_id = ecopontoId;
      return todos("/empresas/me/leituras", q, 200);
    },
    registrarLeitura: function (ecopontoId, sessaoId, code) {
      return Api.post(
        "/ecopontos/" + ecopontoId + "/leituras",
        { sessao_id: sessaoId, code: code },
        { idempotencyKey: uuid() },
      );
    },
  };

  /* ════════════════════════════════════════════════════════
     Master (admin). CONTRATO (assumido):
       GET /admin/pessoas?busca=&por_pagina=
         itens { id, nome, email, cpf_mascarado }  (nunca CPF completo)
       DELETE /admin/pessoas/{id}
       GET /admin/logs-autenticacao?tipo=nome|cpf&termo=&por_pagina=
         itens { data_formatada, nome, cpf_mascarado, metodo_2fa, sucesso }
     (o PDF escreve "logsautenticacao": confirmar o caminho)
  ════════════════════════════════════════════════════════ */
  var Admin = {
    pessoas: function (busca) {
      return Api.get("/admin/pessoas", { busca: busca, por_pagina: 100 }).then(lista);
    },
    /* todas as páginas da busca (para gerar o PDF da lista) */
    todasPessoas: function (busca) {
      return todos("/admin/pessoas", busca ? { busca: busca } : null);
    },
    excluirPessoa: function (id) {
      return Api.del("/admin/pessoas/" + encodeURIComponent(id));
    },
    logs: function (tipo, termo) {
      var q = { por_pagina: 100 };
      if (tipo && tipo !== "todos" && termo) {
        q.tipo = tipo;
        q.termo = termo;
      }
      return Api.get("/admin/logs-autenticacao", q).then(lista);
    },

    /* Ecopontos de todas as empresas.
       filtros: { busca, empresa_id, status: "ativo"|"manutencao"|"inativo" } */
    ecopontos: function (filtros) {
      return Api.get("/admin/ecopontos", Object.assign({ por_pagina: 100 }, filtros)).then(lista);
    },
    /* PATCH só com os campos que mudaram (nome, endereco, status, categorias:["papel"]...) */
    editarEcoponto: function (id, dados) {
      return Api.patch("/admin/ecopontos/" + encodeURIComponent(id), dados).then(unwrap);
    },
    /* { acao: "excluido" | "desativado", message } — com coletas ele só é desativado */
    excluirEcoponto: function (id) {
      return Api.del("/admin/ecopontos/" + encodeURIComponent(id));
    },

    /* Empresas parceiras. filtros: { busca, status: "ativa"|"suspensa" } */
    empresas: function (filtros) {
      return Api.get("/admin/empresas", Object.assign({ por_pagina: 100 }, filtros)).then(lista);
    },
    /* { nome_empresa?, razao_social?, email?, endereco?, status? } */
    editarEmpresa: function (id, dados) {
      return Api.patch("/admin/empresas/" + encodeURIComponent(id), dados).then(unwrap);
    },
    /* { acao: "excluida" | "desativada", message } — com coletas ela só é suspensa */
    excluirEmpresa: function (id) {
      return Api.del("/admin/empresas/" + encodeURIComponent(id));
    },
  };

  var Session = {
    get: getSession,
    save: saveSession,
    update: updateSession,
    clear: clearSession,
    /* Revalida o token e atualiza nome/avatar. 401 já limpa a sessão. */
    refresh: function () {
      return Auth.me().then(function (u) {
        var dados = (u && (u.usuario || u.data)) || u;
        updateSession(dados);
        return dados;
      });
    },
  };

  /* ════════════════════════════════════════════════════════
     Selo de conexão (canto inferior esquerdo)
     Verde = ambiente real; amarelo = servidor de demonstração (dados
     simulados); vermelho = sem conexão. Com mais de um ambiente, clicar
     abre a troca manual. Desligue com MOSTRAR_STATUS: false no config.
  ════════════════════════════════════════════════════════ */
  function atualizarSelo() {
    if (CFG.MOSTRAR_STATUS === false || !ambiente.chave) return;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", atualizarSelo);
      return;
    }
    var demo = ambiente.modo === "demo";
    var cor = ambiente.ok === false ? "#c62828" : demo ? "#f9a825" : "#43a047";
    var texto = ambiente.ok === false ? "Sem conexão · " + ambiente.nome : demo ? "Demonstração · dados simulados" : ambiente.nome;

    var b = document.getElementById("eco-ambiente");
    if (!b) {
      var st = document.createElement("style");
      st.textContent =
        "#eco-ambiente{position:fixed;left:12px;bottom:12px;z-index:10002;display:flex;align-items:center;gap:7px;" +
        "background:rgba(26,46,27,.94);color:#fff;border:0;border-radius:99px;padding:6px 12px;cursor:pointer;" +
        "font:600 12px/1.2 'Plus Jakarta Sans','Poppins',system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)}" +
        "#eco-ambiente.fixo{cursor:default}" +
        "#eco-ambiente i{width:9px;height:9px;border-radius:50%;display:inline-block}" +
        "#eco-amb-menu{position:fixed;left:12px;bottom:48px;z-index:10002;background:#1a2e1b;color:#fff;border-radius:12px;" +
        "padding:6px;display:flex;flex-direction:column;gap:2px;box-shadow:0 8px 24px rgba(0,0,0,.3);" +
        "font:600 12px/1.2 'Plus Jakarta Sans','Poppins',system-ui,sans-serif}" +
        "#eco-amb-menu button{all:unset;cursor:pointer;padding:8px 12px;border-radius:8px}" +
        "#eco-amb-menu button:hover,#eco-amb-menu button:focus-visible{background:rgba(255,255,255,.16)}" +
        "@media print{#eco-ambiente,#eco-amb-menu{display:none!important}}";
      document.head.appendChild(st);
      b = document.createElement("button");
      b.id = "eco-ambiente";
      b.type = "button";
      b.innerHTML = "<i></i><span></span>";
      b.addEventListener("click", alternarMenuAmbiente);
      document.body.appendChild(b);
    }
    b.classList.toggle("fixo", ORDEM.length < 2);
    b.setAttribute("aria-label", "Conexão com a API: " + texto + (ORDEM.length > 1 ? ". Clique para trocar de ambiente." : ""));
    b.querySelector("i").style.background = cor;
    b.querySelector("span").textContent = texto;
    if (demo && document.title.indexOf("[DEMO]") !== 0) document.title = "[DEMO] " + document.title;
  }

  function alternarMenuAmbiente() {
    var antigo = document.getElementById("eco-amb-menu");
    if (antigo) {
      antigo.remove();
      return;
    }
    if (ORDEM.length < 2) return;
    var m = document.createElement("div");
    m.id = "eco-amb-menu";
    m.setAttribute("role", "menu");
    ORDEM.forEach(function (chave) {
      var item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.textContent = "Usar: " + (AMBIENTES[chave].nome || chave) + (chave === ambiente.chave ? " ✓" : "");
      item.addEventListener("click", function () {
        escolherAmbiente(chave);
      });
      m.appendChild(item);
    });
    var auto = document.createElement("button");
    auto.type = "button";
    auto.setAttribute("role", "menuitem");
    auto.textContent = "Automático (o primeiro que responder)";
    auto.addEventListener("click", function () {
      escolherAmbiente(null);
    });
    m.appendChild(auto);
    document.body.appendChild(m);
  }

  /* ════════════════════════════════════════════════════════
     Header: avatar + menu (antes em eco-session.js)
  ════════════════════════════════════════════════════════ */
  function ddItemStyle(color) {
    color = color || "var(--ink)";
    return [
      "display:flex",
      "align-items:center",
      "gap:10px",
      "padding:10px 14px",
      "border-radius:10px",
      "font-size:0.875rem",
      "font-weight:500",
      "color:" + color,
      "text-decoration:none",
      "background:transparent",
      "border:none",
      "width:100%",
      "text-align:left",
      "cursor:pointer",
      "font-family:inherit",
      "transition:background 0.15s,color 0.15s",
    ].join(";") + ";";
  }

  /* ════════════════════════════════════════════════════════
     Cada tipo de conta na sua tela.
       • empresa não usa as telas de morador (coleta, leitor, perfil);
       • pessoa não usa as telas da empresa (painel, perfil da empresa).
     Quem abrir a tela errada vai para a equivalente da sua conta.
     A API também bloqueia (403); aqui é só para não cair no erro.
  ════════════════════════════════════════════════════════ */
  var trocandoDePagina = false;
  var SO_PESSOA = { "coleta.html": "empresa.html", "leitor.html": "empresa.html", "perfil.html": "perfil_empresa.html" };
  var SO_EMPRESA = { "empresa.html": "coleta.html", "perfil_empresa.html": "perfil.html" };

  function paginaAtual() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function protegerPagina() {
    var s = getSession();
    if (!s) return;
    var pg = paginaAtual();
    var destino = s.tipo === "empresa" ? SO_PESSOA[pg] : SO_EMPRESA[pg];
    if (destino) {
      trocandoDePagina = true;
      location.replace(destino);
    }
  }
  protegerPagina();

  /* Para a empresa, a logo leva ao painel dela (não à página inicial do morador) */
  function ajustarLogo() {
    var s = getSession();
    if (!s || s.tipo !== "empresa") return;
    document.querySelectorAll("a.logo, a.brand").forEach(function (a) {
      var href = (a.getAttribute("href") || "").replace("./", "");
      if (href === "" || href === "index.html") a.setAttribute("href", "empresa.html");
    });
  }

  /* "Sessão no Ecoponto" só faz sentido depois de ler o QR da placa.
     Sem sessão ativa: o item some do header e os atalhos levam para a
     Coleta (onde se lê o QR). Com sessão: o item aparece no header. */
  function ajustarLinkSessao() {
    if (paginaAtual() === "leitor.html") return;
    var s = getSession();
    var conectado = !!(s && s.tipo !== "empresa" && Coleta.sessaoAtiva());
    var nav = document.getElementById("main-nav");
    var itemNav = nav && nav.querySelector('a[href="leitor.html"]');

    if (conectado) {
      if (nav && !itemNav) {
        var link = document.createElement("a");
        link.href = "leitor.html";
        link.textContent = "Sessão no Ecoponto";
        var coleta = nav.querySelector('a[href="coleta.html"]');
        nav.insertBefore(link, coleta ? coleta.nextSibling : nav.firstChild);
      }
      return;
    }
    if (itemNav) itemNav.remove();
    document.querySelectorAll('a.btn-scan[href="leitor.html"]').forEach(function (a) {
      a.href = "coleta.html";
      a.textContent = "📷 Ler QR do Ecoponto";
    });
    document.querySelectorAll('a.svc-link[href="leitor.html"]').forEach(function (a) {
      a.href = "coleta.html";
      a.textContent = "Ir para a coleta →";
    });
  }

  function initHeader() {
    ajustarLogo();
    ajustarLinkSessao();
    var sessao = getSession();
    var iconBtn = document.querySelector(".icon-btn[aria-label='Perfil']");
    if (!iconBtn) return;

    if (!sessao) {
      iconBtn.href = LOGIN_PAGE;
      iconBtn.innerHTML = "👤";
      iconBtn.title = "Entrar";
      return;
    }

    var nome = sessao.nome || "";
    var firstName = nome ? nome.split(" ")[0] : "Perfil";
    var initials = nome
      ? nome
          .split(" ")
          .map(function (n) {
            return n[0];
          })
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "?";

    if (sessao.avatar) {
      iconBtn.innerHTML =
        '<img src="' + escapeHtml(sessao.avatar) + '" alt="' + escapeHtml(firstName) + '" ' +
        'style="width:32px;height:32px;border-radius:50%;object-fit:cover;' +
        'border:2px solid var(--sage-400);display:block;" ' +
        "onerror=\"this.replaceWith(document.createTextNode('👤'))\" />";
    } else {
      iconBtn.innerHTML =
        '<div style="width:32px;height:32px;border-radius:50%;' +
        "background:var(--sage-500);color:#fff;font-size:13px;" +
        "font-weight:700;display:flex;align-items:center;" +
        "justify-content:center;border:2px solid var(--sage-400);" +
        'font-family:inherit;">' + escapeHtml(initials) + "</div>";
    }

    iconBtn.href = "#";
    iconBtn.title = firstName;
    iconBtn.style.position = "relative";

    var dropdown = null;

    iconBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (dropdown) {
        dropdown.remove();
        dropdown = null;
        return;
      }

      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var bg = isDark ? "#1e251f" : "#ffffff";
      var border = isDark ? "rgba(90,171,90,0.25)" : "#e2ece2";
      var divClr = isDark ? "rgba(90,171,90,0.15)" : "#EDF0E8";
      var metaClr = isDark ? "rgba(163,195,164,0.55)" : "#6b8f6c";
      var nameClr = isDark ? "#f0f5f0" : "#1a2e1b";
      var hoverBg = isDark ? "rgba(90,171,90,0.12)" : "#EDF0E8";
      var shadow = isDark ? "0.55" : "0.13";

      dropdown = document.createElement("div");
      dropdown.style.cssText =
        "position:absolute;" +
        "top:calc(100% + 10px);" +
        "right:0;" +
        "background:" + bg + ";" +
        "border:1.5px solid " + border + ";" +
        "border-radius:16px;" +
        "box-shadow:0 12px 40px rgba(0,0,0," + shadow + ");" +
        "padding:8px;" +
        "min-width:220px;" +
        "z-index:9999;" +
        "font-family:'Plus Jakarta Sans','Poppins',sans-serif;";

      dropdown.innerHTML =
        '<div style="padding:12px 14px 10px;border-bottom:1.5px solid ' + divClr + ';margin-bottom:6px;display:flex;align-items:center;gap:10px;">' +
          '<div style="width:36px;height:36px;border-radius:50%;background:var(--sage-500);color:#fff;font-size:14px;font-weight:700;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:2px solid var(--sage-400);">' + escapeHtml(initials) + "</div>" +
          "<div>" +
            '<div style="font-weight:700;font-size:0.9rem;color:' + nameClr + ';line-height:1.2;">' + escapeHtml(nome) + "</div>" +
            '<div style="font-size:0.72rem;color:' + metaClr + ';margin-top:2px;">' + escapeHtml(sessao.email) + "</div>" +
          "</div>" +
        "</div>" +
        (sessao.tipo === "empresa"
          ? '<a href="empresa.html" id="dd-coleta" style="' + ddItemStyle() + '"><span style="font-size:16px;">📊</span> Painel da Empresa</a>' +
            '<a href="perfil_empresa.html" id="dd-perfil" style="' + ddItemStyle() + '"><span style="font-size:16px;">🏢</span> Perfil da Empresa</a>'
          : '<a href="coleta.html" id="dd-coleta" style="' + ddItemStyle() + '"><span style="font-size:16px;">🌿</span> Minha Coleta</a>' +
            '<a href="perfil.html" id="dd-perfil" style="' + ddItemStyle() + '"><span style="font-size:16px;">👤</span> Meu Perfil</a>') +
        '<div style="height:1.5px;background:' + divClr + ';margin:6px 0;"></div>' +
        '<button id="eco-logout-btn" style="' + ddItemStyle("var(--sage-500)") + '"><span style="font-size:16px;">🚪</span> Sair da conta</button>';

      iconBtn.appendChild(dropdown);

      dropdown.querySelectorAll("a, button").forEach(function (el) {
        el.addEventListener("mouseenter", function () {
          el.style.background = hoverBg;
        });
        el.addEventListener("mouseleave", function () {
          el.style.background = "transparent";
        });
        el.addEventListener("click", function (ev) {
          ev.stopPropagation();
        });
      });

      document.getElementById("eco-logout-btn").addEventListener("click", function (ev) {
        ev.stopPropagation();
        Auth.logout();
      });

      setTimeout(function () {
        document.addEventListener("click", function closeDD(ev) {
          if (!iconBtn.contains(ev.target)) {
            if (dropdown) {
              dropdown.remove();
              dropdown = null;
            }
            document.removeEventListener("click", closeDD);
          }
        });
      }, 0);
    });

    new MutationObserver(function () {
      if (dropdown) {
        dropdown.remove();
        dropdown = null;
      }
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader);
  } else {
    initHeader();
  }

  /* ── Exports ── */
  Object.defineProperty(Api, "BASE_URL", { get: function () { return BASE_URL; }, enumerable: true });
  Api.ambiente = function () {
    return Object.assign({}, ambiente);
  };
  Api.trocarAmbiente = escolherAmbiente;
  Api.pendentes = function () {
    return pendentes;
  };
  global.Api = Api;
  global.Auth = Auth;
  global.Session = Session;
  global.Pessoas = Pessoas;
  global.Empresas = Empresas;
  global.Cep = Cep;
  global.Me = Me;
  global.Publico = Publico;
  global.Recompensas = Recompensas;
  global.Coleta = Coleta;
  global.EmpresaApi = EmpresaApi;
  global.Admin = Admin;
  // compatibilidade com o que as páginas já chamam
  global.getSession = getSession;
  global.clearSession = clearSession;
  global.requireAuth = requireAuth;
  global.initHeader = initHeader;

  resolverAmbiente(); // começa a sondar já (o selo aparece assim que souber)
})(window);
