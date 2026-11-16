# API Expenses Control Security

API Express/Sequelize do monorepositório. Instalação, variáveis e comandos estão no [README principal](../../README.md).

As rotas continuam organizadas em `routes`, `views`, `controllers` e `models`. Execute as migrations a partir da raiz com `npm run db:migrate`; não use `sequelize.sync` nem o sequelize-cli antigo. O executor preserva a tabela `SequelizeMeta` e os nomes das migrations.

Não inclua senhas, cookies, tokens ou arquivos de ambiente nas contribuições.
