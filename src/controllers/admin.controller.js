import * as admin from '../services/admin.service.js';
import * as subs from '../services/subscription.service.js';

export const me = async (req, res) => res.json(await admin.adminMe(req.user.doc));
export const listFarmers = async (req, res) => res.json(await admin.listFarmers(req.query));
export const getFarmer = async (req, res) => res.json(await admin.getFarmerDetail(req.params.id));
export const approve = async (req, res) => res.json(await subs.approve(req.params.id, req.user.id));
export const suspendReactivate = async (req, res) => res.json(await admin.suspendReactivate(req.params.id, req.body.status));
export const resetPassword = async (req, res) => res.json(await admin.resetPassword(req.params.id));
export const deactivate = async (req, res) => res.json(await admin.deactivateFarmer(req.params.id));

export const recordPayment = async (req, res) => res.json(await subs.recordPayment(req.body, req.user.id));
export const activateSub = async (req, res) => res.json(await subs.recordPayment({ ...req.body, farmerId: req.params.farmerId }, req.user.id));
export const patchSub = async (req, res) => res.json(await subs.forceStatus(req.params.farmerId, req.body.status));
export const listPayments = async (req, res) => res.json(await admin.listPayments(req.query));

export const dashboard = async (req, res) => res.json(await admin.dashboard());
export const getConfig = async (req, res) => res.json(await admin.getConfig());
export const updateConfig = async (req, res) => res.json(await admin.updateConfig(req.body));

export const listCrops = async (req, res) => res.json({ data: await admin.cropsCrud.list() });
export const createCrop = async (req, res) => res.status(201).json(await admin.cropsCrud.create(req.body));
export const updateCrop = async (req, res) => res.json(await admin.cropsCrud.update(req.params.id, req.body));
export const listExpenseCats = async (req, res) => res.json({ data: await admin.expenseCatCrud.list() });
export const createExpenseCat = async (req, res) => res.status(201).json(await admin.expenseCatCrud.create(req.body));
export const updateExpenseCat = async (req, res) => res.json(await admin.expenseCatCrud.update(req.params.id, req.body));
export const listIncomeCats = async (req, res) => res.json({ data: await admin.incomeCatCrud.list() });
export const createIncomeCat = async (req, res) => res.status(201).json(await admin.incomeCatCrud.create(req.body));
export const updateIncomeCat = async (req, res) => res.json(await admin.incomeCatCrud.update(req.params.id, req.body));
