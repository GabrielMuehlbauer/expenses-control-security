![Expenses Control](apps/web/src/assets/images/capa-github.png)

# Expenses Control Security

Sistema web de controle de finanças pessoais, reunindo o frontend e a API dos projetos originais de Gabriel Muehlbauer em um repositório único. A interface mantém React e CSS Modules; a API mantém Express, Sequelize e MySQL.

O histórico deste repositório começa com uma cópia atual, sem importar os commits anteriores. Consulte [a origem do código](docs/origem.md) e [as contribuições](docs/contribuicoes.md).

## Tecnologias

- Node.js 24 LTS e npm 11.
- React 19, Vite 8, React Router e Axios.
- Express 5, Sequelize 6 e MySQL 8.4; MariaDB 10.4 foi usado nos testes locais de compatibilidade.
- Bcrypt, JWT em cookie HttpOnly, Helmet e limitação de tentativas.
- Testes com Node Test Runner, Supertest e Playwright.

As versões exatas estão no `package-lock.json`. Instale com `npm ci` na raiz, sem instalar dependências separadamente em cada aplicação.

## Execução local

Pré-requisitos: Git, Node.js 24, npm e um MySQL disponível. Docker é uma alternativa para iniciar apenas o banco.

```sh
git clone https://github.com/GabrielMuehlbauer/expenses-control-security.git
cd expenses-control-security
npm ci --ignore-scripts
```

Copie `apps/api/.env.example` para `apps/api/.env`. No PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Coloque o valor gerado em `JWT_SECRET`. Configure o banco e suas credenciais no mesmo arquivo. Não publique esse arquivo.

Se estiver usando MySQL já instalado, crie um banco vazio `expenses_control_security` e um usuário exclusivo com acesso a ele. Não use credenciais de uma base real para os testes.

Como alternativa, para usar o banco do Compose no PowerShell:

```powershell
$env:MYSQL_PASSWORD = Read-Host 'Senha do usuário da aplicação'
$env:MYSQL_ROOT_PASSWORD = Read-Host 'Senha administrativa do banco local'
docker compose up -d db
```

Use a mesma `MYSQL_PASSWORD` em `apps/api/.env`. O Compose publica o banco somente em `127.0.0.1:3306`; se a porta estiver ocupada, ajuste a porta publicada e `MYSQL_PORT`.

Depois de o banco estar pronto:

```sh
npm run db:migrate
npm run dev
```

Abra `http://localhost:5173`. A API usa a porta 3000. O Vite encaminha `/api` para a API; os cookies ficam na mesma origem do navegador. Use `localhost` consistentemente. Para outro endereço, configure `WEB_ORIGINS` com a origem exata.

Cadastre sua conta pela interface. A senha deve ter pelo menos 12 caracteres e no máximo 72 bytes. Não existe uma senha administrativa padrão.

Opcionalmente, configure `DEMO_PASSWORD` e execute `npm run db:seed`. O usuário demonstrativo é `admin@expensescontrol.com`, com a senha escolhida na configuração. Seeders são bloqueados em produção.

## Build e produção

```sh
npm run build
npm start
```

A API serve o build do frontend na mesma origem. Em produção, configure `NODE_ENV=production`, `WEB_ORIGINS` com HTTPS, segredo próprio e acesso ao banco por usuário dedicado. Use um proxy HTTPS. Não exponha o servidor de desenvolvimento do Vite. A API não habilita confiança automática em cabeçalhos de proxy.

## Testes

Copie `apps/api/.env.test.example` para `apps/api/.env.test`, configure um banco separado cujo nome termine em `_test` e gere outro `JWT_SECRET`. O usuário de teste precisa criar bancos temporários para a verificação de migração; isso é exclusivamente para o ambiente de testes.

```sh
npm run lint
npm run build
npm audit --audit-level=moderate
npm test
```

Os testes criam dados fictícios e usam conexões reais ao banco. O teste de atualização cria e remove somente um banco temporário com nome aleatório. Nunca configure uma base usada por pessoas como banco de teste.

Para os testes de navegador, execute `npm test` antes, para preparar o schema, e configure `PORT=3001` no `.env.test`. No Windows com Edge instalado:

```sh
npm run test:e2e
```

Alternativa com Chromium no PowerShell:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm run test:e2e
```

O Playwright inicia e encerra os servidores de teste nas portas 3001 e 5173. Elas precisam estar disponíveis. O banco de testes precisa continuar em execução.

## Segurança e documentação

Os controles incluem validação de entrada no servidor, rejeição de campos inesperados, isolamento por usuário, ORM, hash de senhas, sessão revogável, CSRF, CORS restrito, cabeçalhos de segurança e erros sem detalhes internos. A documentação relaciona cada controle aos testes correspondentes.

- [Arquitetura e migração](docs/arquitetura.md)
- [Controles de segurança](docs/seguranca.md)
- [Testes e resultados](docs/testes.md)
- [Origem e licença](docs/origem.md)
- [Contribuições](docs/contribuicoes.md)

Licença MIT. As funcionalidades adicionais do enunciado serão descritas após a confirmação das regras de receitas, comprovantes e controle parental.
