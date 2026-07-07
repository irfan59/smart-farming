import * as svc from '../services/plot.service.js';

export async function create(req, res) {
  res.status(201).json(await svc.createPlot(req.user.doc, req.body));
}
export async function list(req, res) {
  res.json({ data: await svc.listPlots(req.user.id) });
}
export async function getOne(req, res) {
  res.json(req.owned);
}
export async function update(req, res) {
  res.json(await svc.updatePlot(req.owned, req.body));
}
export async function remove(req, res) {
  res.json(await svc.deactivatePlot(req.owned));
}
