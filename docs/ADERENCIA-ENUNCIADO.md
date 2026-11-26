# EcoTech — Aderência ao enunciado (Projeto de Desenvolvimento em Back-End, ADS)

Conferido no código do front. Backend, responsividade em aparelhos reais e os entregáveis em documento não foram verificados aqui.

**Legenda:** ✅ atende · ⚠️ atende em parte · ❌ não atende · 🔒 desvio **decidido pelo grupo** (não será corrigido)

## Telas

| Tela | Situação | Observação |
|---|---|---|
| Principal (menu + descrições) | ✅ | `index.html` |
| Cadastro de usuário | ⚠️ 🔒 | só comum se cadastra; ver "Cadastro" abaixo |
| Login | ⚠️ 🔒 | campo "E-mail" (aceita e-mail ou login) e sem botão Limpar |
| Erro | ✅ | `error_page.html` real + `404.html`; aberta em acesso negado (403) e falha do servidor (5xx) |
| 2FA | ⚠️ 🔒 | Google e empresa entram sem 2FA |
| Consulta de usuário (busca por parte do nome, exclusão com confirmação) | ✅ | busca no servidor; só master |
| Alteração de senha (só comum, a própria) | ✅ | master vê aviso; a API deve responder 403 |
| Modelo do BD (imagem) | ✅ | `assets/modelo-bd.svg` e `.png`, para master e comum |
| Tela de Log (nome, CPF ou todos; dia/hora, nome, 2FA; mais recentes primeiro) | ✅ | a ordem é responsabilidade da API (registrado no documento do backend) |

## Informações sobre as telas
| Requisito | Situação |
|---|---|
| Login do usuário no canto superior direito | ⚠️ 🔒 (mostra iniciais/nome, não o login) |
| Logout em todas as telas após autenticar | ✅ (menu do avatar; `perfil.html` tem botão próprio) |
| Menu em todas as telas após autenticar | ✅ |
| Feedback elegante, sem `alert()` | ✅ toasts e modais; **nenhum `alert()`/`confirm()`/`prompt()` no projeto** |
| Perfil controlado pela sessão | ✅ |

## Cadastro
| Regra | Situação |
|---|---|
| 1. Campos obrigatórios | ✅ |
| 2. Nome de 15 a 80 caracteres **alfabéticos** | ⚠️ 🔒 (tamanho validado; letras não) |
| 3. CPF com dígito verificador | ✅ |
| 4. CEP validado + API para o endereço; manual se falhar | ✅ |
| 5. Telefones `(+55)XX-XXXXXXXX` | ⚠️ 🔒 (celular com 9 dígitos, máscara `(XX) XXXXX-XXXX`) |
| 6. Login com exatamente 6 letras | ✅ |
| 7. Senha de 8 letras, criptografada | ⚠️ 🔒 (criptografada ✅; regra atual é 8+ com maiúscula, minúscula e número) |
| 8. Senha = confirmação | ✅ |
| Botões Enviar e Limpar tela | ✅ |
| Salvar no banco e **redirecionar ao login** | ⚠️ 🔒 (pode ir ao início se a API devolver token) |

## 2FA
| Regra | Situação |
|---|---|
| Pergunta aleatória (mãe, nascimento, CEP), resposta conferida no banco | ✅ |
| Resposta obrigatória | ✅ |
| 3 erros: "3 tentativas sem sucesso! Favor realizar Login novamente." e volta ao login | ✅ |

## Desafio Plus
| Item | Situação | Observação |
|---|---|---|
| Botão para baixar a lista de usuários em PDF | ✅ | jsPDF; baixa o arquivo (todas as páginas da busca, CPF mascarado) |
| Barra de acessibilidade com 2 mecanismos | ✅ | contraste (fundo escuro/fonte clara e o inverso) e tamanho da fonte (A−, A, A+) |

Limitação da fonte: textos em `rem` escalam; os que têm tamanho fixo em `px` (cerca de um terço das declarações de CSS) não.

## Demais requisitos
| Requisito | Situação |
|---|---|
| Responsivo | ✅ tag de viewport e CSS responsivo em todas as páginas (testar em desktop e celular) |
| MySQL | ✅ (backend) |
| PHP no back-end | ✅ (Laravel) |
| Identidade visual clara | ✅ tema claro por padrão (escuro só por escolha) |

## Entregáveis de avaliação (fora do código do front)
| Item | Situação |
|---|---|
| Análise de requisitos (funcionais e não funcionais) | ❌ a produzir |
| MER (modelo conceitual) | ❌ temos DER (`DER.md`) e modelo lógico (`MODELO-LOGICO.md`) |
| DER | ✅ |
| Script SQL de criação do banco | ⚠️ previsto (`01_schema.sql`); as migrations do Laravel não substituem o script pedido |
| Master criado por script SQL | ⚠️ o plano atual usa seeder com senha no `.env`; ajustar (ver `BACKEND-ajustes-vindos-do-front.md`, 7.5b) |
| Documento `.doc` do grupo, atas e atividades por componente | ❌ a produzir |
| 2 perfis (master e comum) | ⚠️ a conta de **empresa** é um terceiro tipo; justificar na apresentação |
