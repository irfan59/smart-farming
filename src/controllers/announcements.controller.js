import * as svc from '../services/announcement.service.js';

export const create = async (req, res) => res.status(201).json(await svc.create(req.body, req.user.id));
export const listAdmin = async (req, res) => res.json({ data: await svc.listAdmin() });
export const listFarmer = async (req, res) => res.json({ data: await svc.listFarmer() });
