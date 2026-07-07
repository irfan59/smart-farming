import * as svc from '../services/farmer.service.js';

export async function getMe(req, res) {
  res.json(await svc.getMe(req.user.doc));
}
export async function updateMe(req, res) {
  res.json(await svc.updateMe(req.user.doc, req.body));
}
export async function deactivate(req, res) {
  res.json(await svc.deactivateMe(req.user.doc));
}
export async function fcmToken(req, res) {
  res.json(await svc.registerFcmToken(req.user.doc, req.body.token));
}
