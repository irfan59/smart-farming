import * as svc from '../services/transaction.service.js';

export async function create(req, res) {
  res.status(201).json(await svc.createTransaction(req.user.id, req.body));
}
export async function list(req, res) {
  res.json({ data: await svc.listTransactions(req.user.id, req.query) });
}
export async function update(req, res) {
  res.json(await svc.updateTransaction(req.owned, req.body));
}
export async function remove(req, res) {
  res.json(await svc.voidTransaction(req.owned));
}
export async function suggestedImputed(req, res) {
  res.json(await svc.suggestedImputed(req.user.id, req.query.cropCycleId));
}
