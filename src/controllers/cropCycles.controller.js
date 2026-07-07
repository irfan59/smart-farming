import * as svc from '../services/cropCycle.service.js';

export async function create(req, res) {
  res.status(201).json(await svc.createCropCycle(req.user.id, req.body));
}
export async function list(req, res) {
  res.json({ data: await svc.listCropCycles(req.user.id, req.query) });
}
export async function getOne(req, res) {
  res.json(req.owned);
}
export async function update(req, res) {
  res.json(await svc.updateCropCycle(req.owned, req.body));
}
export async function remove(req, res) {
  res.json(await svc.deactivateCropCycle(req.owned));
}
