function httpError(statusCode, message) { return Object.assign(new Error(message), { statusCode }); }
function errorHandler(error, req, res, _next) {
  let status = error.statusCode || error.status || 500;
  let message = error.message;
  if (error.name === 'SequelizeUniqueConstraintError') { status = 409; message = 'Ja existe um registro com esses dados.'; }
  if (error.name === 'SequelizeForeignKeyConstraintError') { status = 409; message = 'A operacao conflita com registros associados.'; }
  if (error.name === 'SequelizeValidationError') { status = 400; message = 'Dados invalidos.'; }
  if (error.type === 'entity.parse.failed') { status = 400; message = 'JSON invalido.'; }
  if (error.type === 'entity.too.large') { status = 413; message = 'Requisicao muito grande.'; }
  if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;
  if (status >= 500) {
    console.error(JSON.stringify({ event: 'request_error', requestId: req.id, type: error.name || 'Error' }));
    message = 'Erro interno do servidor. Tente novamente.';
  }
  res.status(status).json({ error: message, requestId: req.id });
}
module.exports = { httpError, errorHandler };
