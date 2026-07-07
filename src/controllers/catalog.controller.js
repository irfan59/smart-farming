import * as svc from '../services/catalog.service.js';

export async function crops(req, res) {
  res.json({ data: await svc.crops() });
}
export async function expenseCategories(req, res) {
  res.json({ data: await svc.expenseCategories() });
}
export async function incomeCategories(req, res) {
  res.json({ data: await svc.incomeCategories() });
}
export async function landUnits(req, res) {
  res.json({ data: await svc.landUnits() });
}
