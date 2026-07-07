// Carries an HTTP status + a stable STRING_CODE + human message.
// The error middleware serializes it as the contract shape: { error: { code, message } }.
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}
