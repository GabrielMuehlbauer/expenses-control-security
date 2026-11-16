# Arquitetura e migração

## Organização

O monorepositório usa npm workspaces. `apps/api` é CommonJS e `apps/web` usa módulos ES. A API conserva os diretórios originais: `routes` define os endpoints e validações, `views` recebe HTTP e formata respostas, `controllers` coordena regras e `models` consulta o banco com Sequelize. A separação de `app.js` e `server.js` permite testar o Express sem iniciar uma porta fixa.

O frontend conserva páginas, componentes e CSS Modules. Axios usa caminhos relativos `/api`; no desenvolvimento o Vite encaminha as chamadas e, depois do build, o Express serve a aplicação. A sessão é confirmada pela API ao carregar a página. Dados do usuário em estado React servem à interface; o servidor continua responsável por toda autorização.

## Dados

As tabelas iniciais de usuários, categorias e despesas mantêm seus nomes e identificadores. Categorias têm unicidade composta por proprietário e nome. Dinheiro usa DECIMAL(12,2), e valores são enviados pela API como strings decimais. As datas financeiras são civis, no formato `AAAA-MM-DD`, armazenadas como DATE. A apresentação não converte essas datas em meia-noite no fuso do navegador.

Sessões têm ID aleatório, usuário, hash CSRF e expiração. O JWT aponta para a sessão; sua assinatura e o registro no banco precisam ser válidos. Excluir o registro revoga a sessão mesmo que alguém retenha uma cópia do cookie.

## Execução das migrations

As migrations originais foram preservadas, com ajustes de argumentos não utilizados. As novas migrations são aplicadas depois delas. O executor em `src/database/migrate.js` usa os mesmos nomes e a mesma tabela `SequelizeMeta` do sequelize-cli, com lock consultivo no banco para evitar execução simultânea. A ferramenta antiga foi removida para eliminar dependências transitivas vulneráveis; o ORM e os arquivos de migration foram mantidos.

O executor roda somente `up`; não aplica `sync({alter:true})` e não recria tabelas. Ele registra o arquivo apenas quando a execução termina com sucesso.

## Atualizar uma cópia da base antiga

1. Interrompa gravações e faça backup completo do banco, incluindo `SequelizeMeta`.
2. Restaure o backup em uma base separada e configure esta aplicação para acessar essa cópia.
3. Confirme que `SequelizeMeta` registra as três migrations antigas. Se a base foi criada manualmente, primeiro reconcilie o schema com essas migrations; não marque arquivos como aplicados sem conferir.
4. Execute `npm run db:migrate`.
5. Confira usuários, categorias, IDs, vínculos, datas e somas antes de liberar o uso.

A alteração de FLOAT para DECIMAL arredonda para dois centavos. A alteração de DATETIME para DATE conserva o dia armazenado no banco, sem tentar inferir fuso de uma origem desconhecida. Revise dados fora dos limites de DECIMAL, valores negativos e datas inválidas antes da migração.

MySQL faz commits implícitos em diversas alterações de schema: a migration financeira não é inteiramente transacional. Se ela falhar no meio, restaure o backup validado e corrija a causa antes de repetir. Ela não oferece rollback automático para FLOAT, pois isso poderia perder precisão. O teste automatizado verifica a atualização de uma base legada representativa e a repetição do executor depois de aplicada.

O banco já utilizado pelas aplicações antigas não foi modificado durante o desenvolvimento; a verificação local usou uma pasta e uma porta isoladas.
