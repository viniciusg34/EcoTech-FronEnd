// Servidor estático mínimo para abrir o front sem Live Server (sem dependências).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".mp4": "video/mp4", ".woff2": "font/woff2" };

export function criarFront(raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const arquivo = path.normalize(path.join(raiz, rel));
    // não sai da pasta do projeto nem serve o servidor de demonstração
    if (!arquivo.startsWith(raiz + path.sep) || arquivo.startsWith(path.join(raiz, "servidor-demo") + path.sep) || arquivo.includes(`${path.sep}.git${path.sep}`)) {
      res.writeHead(403); return res.end("Acesso negado");
    }
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) {
        res.writeHead(404, { "Content-Type": TIPOS[".html"] });
        return fs.readFile(path.join(raiz, "404.html"), (_, p) => res.end(p || "Não encontrado"));
      }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(arquivo).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(dados);
    });
  });
}
