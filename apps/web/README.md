# Frontend Expenses Control Security

Frontend React/Vite com o design e os CSS Modules do projeto original. Siga o [README principal](../../README.md) para executar o monorepositório.

As chamadas usam `/api` na mesma origem. O token de sessão fica em cookie HttpOnly; o cliente mantém em memória apenas o token CSRF e o estado da interface. O usuário autenticado é confirmado pela API a cada recarga.
