# Testes e evidências

Verificação local em 16/11/2026, com Node 24.11.0, npm 11.6.1, MariaDB 10.4.32 em porta e pasta isoladas e Microsoft Edge via Playwright. A emulação mobile usa viewport e interação de celular, no fuso America/Sao_Paulo; não representa teste em aparelho físico.

| Verificação | Resultado registrado |
|---|---|
| Instalação limpa pelo lockfile, sem scripts de instalação | Aprovada |
| Lint de API e frontend | Aprovado |
| Build de produção | Aprovado |
| Test Runner: configuração, migração legada e API com banco real | 23 testes reportados, todos aprovados |
| Navegador desktop | 2 fluxos completos aprovados |
| Navegador com emulação mobile | 2 fluxos completos aprovados |
| Auditoria de dependências após atualização | 0 vulnerabilidades reportadas pelo npm |

## Cobertura funcional e de segurança

- Cadastro, validação de senha, login válido/inválido e retorno de erros.
- Cookie HttpOnly, atributos de produção, rejeição da chave JWT antiga, assinatura inválida e token expirado.
- CSRF ausente, adulterado, sem cookie, origem externa e token transplantado de outra sessão.
- Isolamento entre usuários em listagem, leitura, alteração, exclusão, categoria vinculada e agregações.
- CRUD de categorias e despesas, unicidade por usuário, bloqueio da exclusão de categoria em uso na API e no banco.
- Valores decimais, soma de 0,10 + 0,20, data civil, filtros combinados, intervalos e limpeza de descrição.
- Conteúdo HTML hostil exibido como texto no navegador, sem criar elementos executáveis.
- JSON inválido, corpo excessivo, campos não permitidos e erros sem mensagens SQL.
- Logout com invalidação de cópia do token e persistência correta após recarga.
- Limitação de tentativas de login e mensagem de erro/repetição no dashboard.
- Atualização de schema legado, preservação de IDs, vínculos, descrição, hash de senha e data, arredondamento para centavos e repetição do executor.

## Reprodução

Siga a configuração de `.env.test` no README e execute na raiz:

```sh
npm ci --ignore-scripts
npm run lint
npm run build
npm audit --audit-level=moderate
npm test
npm run test:e2e
```

O banco padrão de testes precisa terminar em `_test`. O teste de migração cria e remove um banco próprio, com nome aleatório. Os demais testes usam apenas usuários fictícios. A conta do banco de teste precisa das permissões para essas operações, exclusivamente em um ambiente isolado.

Falhas de navegador geram artefatos em `test-results/` e um relatório em `playwright-report/`, ambos ignorados pelo Git. O workflow valida também MySQL 8.4 no GitHub; sua execução remota deve ser conferida após publicar o código.

Os resultados não abrangem auditoria externa, infraestrutura de hospedagem, teste de carga ou conformidade integral com OWASP ASVS. A cobertura das funcionalidades adicionais de receitas, comprovantes e controle parental será acrescentada junto à implementação dessas regras.
