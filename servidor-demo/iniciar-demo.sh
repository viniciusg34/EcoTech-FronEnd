#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js não encontrado. Instale em https://nodejs.org e tente de novo."; exit 1; }
node iniciar.mjs
