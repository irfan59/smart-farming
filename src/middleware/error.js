// Central error handler. Emits the pinned contract shape: { error: { code, message } }.
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'ERROR';
  const message = err.message || 'Server error';
  if (status >= 500 && req.log) req.log.error({ err }, 'unhandled error');
  res.status(status).json({ error: { code, message } });
}
