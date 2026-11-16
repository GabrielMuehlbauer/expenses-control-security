# Controles de segurança

Esta documentação descreve os controles implementados, usando como referência os temas do [OWASP ASVS](https://asvs.owasp.org/). Não declara certificação nem conformidade integral com o padrão.

| Risco | Implementação | Verificação |
|---|---|---|
| SQL injection | Consultas por Sequelize e parâmetros; valores não são concatenados em SQL. Nomes de bancos temporários são gerados pelo teste. | Entrada SQL em filtros rejeitada; texto hostil preservado como dado |
| Mass assignment | Lista explícita de campos para cadastro, categorias e despesas; campos extras rejeitados | Tentativas com `role` e `userId` rejeitadas |
| Acesso a outro usuário | Consultas e agregações filtradas pelo proprietário; categoria validada antes do vínculo | Usuários A/B tentam ler, alterar, excluir e vincular dados entre si |
| Autenticação fraca | Senha de 12 caracteres no mínimo e até 72 bytes; bcrypt custo 12; resposta sem hash | Hash no banco e rejeição de senha fraca |
| Chave JWT previsível | Segredo obrigatório, mínimo de 32 bytes e diversidade básica; geração aleatória documentada | Configuração ausente, curta e repetitiva falha; chave antiga rejeitada |
| Sequestro/fixação de sessão | JWT HS256 com issuer/audience, jti aleatório, registro no banco, expiração e logout revogável | Token adulterado/expirado e cópia após logout rejeitados |
| Exposição por JavaScript | Cookie HttpOnly; Secure e prefixo `__Secure-` em produção; SameSite=Lax; nenhuma autenticação no localStorage | Cookie inspecionado pela API e pelo navegador |
| CSRF | Cookie CSRF assinado, token em cabeçalho, vínculo do hash à sessão e verificação de origem/Fetch Metadata | Token ausente, diferente, sem cookie e transplantado rejeitados |
| XSS | React apresenta texto sem inserir HTML; nenhum `dangerouslySetInnerHTML`; CSP no servidor que entrega o build | Texto HTML hostil aparece literalmente e não cria elemento executável |
| Abuso de autenticação | Limite de falhas por IP em login/cadastro; respostas 429 com Retry-After | Sequência de falhas limitada |
| Dados inválidos | Validação de corpo, UUID, e-mail, tamanho, enums, valores, datas e filtros no servidor | Casos inválidos retornam 400 sem detalhes SQL |
| Divulgação de informações | Erros centralizados; respostas internas genéricas e ID da requisição; não registrar corpos, cookies ou SQL | JSON incorreto/corpo excessivo recebem erros controlados |
| Configuração/dependências | Arquivos de ambiente ignorados, segredo sem fallback, instalação por lockfile, auditoria na CI | Instalação limpa, lint, build e npm audit |

## Sessão e CSRF

Antes de uma operação que altera dados, o cliente chama `GET /api/auth/csrf`, recebe o token CSRF e o mantém em memória. O servidor grava um cookie assinado HttpOnly. O cliente envia o token no cabeçalho `X-CSRF-Token`; o servidor compara o cabeçalho com o cookie e, em sessão autenticada, com o hash registrado na sessão. Login e cadastro também exigem CSRF. O JWT nunca é devolvido ao JavaScript.

`GET /api/auth/session` confirma o usuário atual. `POST /api/auth/logout` exclui a sessão e limpa o cookie. A expiração padrão é de uma hora, configurável de 60 segundos a 24 horas. Os registros expirados são removidos durante novos logins; a verificação também rejeita registros vencidos imediatamente.

Cookies HttpOnly reduzem o acesso direto ao token por JavaScript, mas não eliminam todos os efeitos de um XSS. SameSite e CORS complementam a proteção; não substituem o token CSRF nem a autorização.

## Configuração de produção

Use HTTPS, origem exata, usuário de banco dedicado e segredos próprios fora do repositório. O proxy deve servir a aplicação e a API na mesma origem. CSP permite estilos inline porque a interface original usa objetos `style`; scripts continuam restritos à própria origem. Fontes externas já utilizadas pelo design são permitidas nos domínios específicos.

O limitador em memória serve a uma instância de API. Uma implantação com múltiplas instâncias precisa de armazenamento compartilhado para esse controle. A aplicação não confia automaticamente em `X-Forwarded-For`; qualquer configuração de proxy deve ser limitada à infraestrutura efetiva.

O override de `uuid` atualiza a dependência transitiva do Sequelize para a versão 11, que ainda oferece a interface CommonJS utilizada pelo ORM. Essa compatibilidade é coberta pelos testes com banco. A dependência `dottie` ainda é marcada como descontinuada pelo registro, sem alerta de vulnerabilidade na auditoria executada; acompanhar as atualizações do Sequelize.
