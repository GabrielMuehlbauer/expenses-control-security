# Segurança

Não publique senhas, tokens, dados financeiros ou comprovantes em issues. Para comunicar um problema, use o contato do responsável listado no perfil do GitHub e descreva o problema sem expor dados de terceiros.

O projeto exige segredo JWT próprio, banco com credenciais configuradas e HTTPS para cookies de produção. Não existe senha de demonstração fixa. Crie as configurações locais a partir dos arquivos de exemplo; nunca versione `.env`.

A documentação técnica está em [docs/seguranca.md](docs/seguranca.md). Testes automatizados e auditoria de dependências ajudam a verificar os controles; não representam uma garantia de ausência de vulnerabilidades.
