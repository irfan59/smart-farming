import * as svc from '../services/report.service.js';

export async function monthly(req, res) {
  res.json(await svc.monthly(req.user.id, Number(req.query.year), Number(req.query.month)));
}
export async function yearly(req, res) {
  res.json(await svc.yearly(req.user.id, req.query.year));
}
export async function perAcre(req, res) {
  res.json({ data: await svc.perAcre(req.user.id) });
}
export async function seasonComparison(req, res) {
  res.json({ data: await svc.seasonComparison(req.user.id, req.query.crop) });
}
export async function cropRanking(req, res) {
  res.json({ data: await svc.cropRanking(req.user.id) });
}
export async function byCategory(req, res) {
  res.json({ data: await svc.byCategory(req.user.id, req.query.type) });
}
export async function cropCycle(req, res) {
  res.json(await svc.cropCycleReport(req.owned));
}
