"use strict";

/* ══════════════════════════════════════════════════════════
   config.js — Único lugar com endereços e chaves.
   Carregue ANTES de js/api.js em todas as páginas.

   AMBIENTES e ORDEM
     Onde está a API. Cada ambiente tem um nome (aparece no selo no canto
     da tela) e uma BASE_URL com o prefixo /api/v1, sem barra no final.
     O front pergunta a cada ambiente (GET /saude) e usa o primeiro da
     ORDEM que responder; se ele cair durante o uso, passa para o próximo
     e pede novo login (cada ambiente tem o seu banco).
       • servidor: API oficial, hospedada no Railway (HTTPS). É a primeira
                   da ORDEM: o site usa ela sempre que estiver no ar.
       • porta8000 / local: API rodando no seu computador (php artisan
                   serve ou XAMPP). Só entram se o servidor não responder,
                   e só quando o site está aberto em localhost.
     Para fixar um ambiente: abra o site com ?ambiente=local ou
     ?ambiente=servidor (e ?ambiente=auto volta ao automático), ou clique
     no selo de conexão. O servidor de demonstração (pasta servidor-demo)
     também responde em http://localhost:8000/api/v1 e aparece em amarelo,
     como "Demonstração · dados simulados".

   MOSTRAR_STATUS
     true mostra o selo de conexão; false esconde.

   CARTO_KEY
     Chave GRATUITA dos tiles do mapa (CARTO). Desde o fim de ago/2026 a
     CARTO exige chave: sem ela cada tile sai com a marca "API KEY REQUIRED".
     Peça em https://carto.com/basemaps/apikey (e-mail + domínio do site,
     sem fila de aprovação; gratuito até 5 milhões de tiles/mês).
     É uma chave de front-end, visível no navegador por natureza: use um
     domínio só para ela (ex.: o da Vercel) e peça outra para localhost.
     Sem chave, o mapa cai no OpenStreetMap padrão (ver js/eco-map-tiles.js).

   AVISO_EMAIL
     Quem recebe um e-mail de aviso quando uma empresa gera um Ecoponto
     novo (painel da empresa). O envio é feito pelo FormSubmit
     (formsubmit.co), direto do navegador, sem servidor de e-mail.
     Na PRIMEIRA vez, o FormSubmit manda para esse endereço um e-mail
     "Activate Form": é só clicar no botão uma vez. Depois disso todos os
     avisos chegam direto. O e-mail de ativação traz um código aleatório
     que pode substituir o endereço aqui (assim o e-mail não fica à mostra
     no código do site).

   GOOGLE_CLIENT_ID
     ID público do OAuth (termina em .apps.googleusercontent.com).
     Não é segredo; a validação do token é feita pela API.
══════════════════════════════════════════════════════════ */
window.ECOTECH_CONFIG = {
  AMBIENTES: {
    // php artisan serve (porta 8000) e o servidor-demo (plano B) respondem aqui
    porta8000: { nome: "Local (porta 8000)", BASE_URL: "http://localhost:8000/api/v1" },
    local: { nome: "Local", BASE_URL: "http://localhost/ecotech/backend/public/api/v1" }, // XAMPP (htdocs)
    // API oficial do projeto (Railway), passada pelo líder em 26/11
    servidor: { nome: "Servidor (Railway)", BASE_URL: "https://ecotech-backend-production-5d655abd.up.railway.app/api/v1" },
  },
  ORDEM: ["servidor", "porta8000", "local"],
  MOSTRAR_STATUS: true,
  CARTO_KEY: "",
  AVISO_EMAIL: "viniciusgomesdecerqueira@gmail.com",
  GOOGLE_CLIENT_ID: "547710554770-v2ofvchbeskjbm9d80pq12m3jncve5v7.apps.googleusercontent.com",
};
