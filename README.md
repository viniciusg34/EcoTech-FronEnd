# EcoTech

🌿 EcoTech
Projeto da faculdade Unisuam

Plataforma web de reciclagem e sustentabilidade para a região metropolitana do Rio de Janeiro e Costa Verde. Conecta usuários a Ecopontos, empresas parceiras e recompensas por reciclagem.

⚙️ Tecnologias

HTML, CSS e JavaScript vanilla — sem frameworks
Leaflet.js — mapa interativo de Ecopontos
ZXing — leitura de QR code e código de barras pela câmera
QRCode.js — geração de QR codes para placas de Ecopontos
API em Laravel (repositório do back-end) — toda a ligação fica em js/api.js
Vercel — deploy estático

🔌 API

Endereço base: constante API em js/api.js (http://127.0.0.1:8000/api no PC). Ao publicar a API, troque só ela.
Todo fetch usa credentials: "include": o login é um cookie de sessão, e quem diz o perfil é o GET /sessao.

🎨 Design System

Paleta: #0B0F0D, #1F2A1F, #3E5A3F, #8CA98C, #D9C7A3 e #B08D57 — variáveis CSS como --cream, --sage-*, --ink-*
Fontes: Plus Jakarta Sans (UI) + Lora (títulos)
Tema claro/escuro via html[data-theme] com persistência no localStorage
Containers: tema claro verde e tema escuro claro, com um único efeito de inclinação (eco-interacoes.css e eco-interacoes.js)
Efeito das folhas: estação definida automaticamente pela data do computador do usuário
CSS organizado por páginas: coleta.css, empresa.css, perfil.css, etc.

🚀 Como rodar localmente

1. No repositório da API: php artisan serve
2. Aqui: abra com o Live Server do VS Code (http://127.0.0.1:5500). Abrindo o arquivo direto pelo Windows, o navegador bloqueia o cookie de login.
3. O endereço do site precisa estar em CORS_ORIGENS no .env da API.

🧪 Logins para avaliação

Com a API rodando: master / Ecotechm. No segundo fator: mãe Maria da Silva, nascimento 01/01/2000 ou CEP 20000-000.
Com a API fora do ar: teste@ecotech.com / Teste123 (pessoa) e empresa@ecotech.com / Teste123 (empresa). Servem só para ver as telas, sem dados reais. Apague CONTAS_TESTE de js/api.js antes de publicar para usuários reais.
