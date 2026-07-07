import { z } from 'zod';
import * as authService from '../services/auth.service.js';

export const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  village: z.string().min(1),
  state: z.string().min(1),
  district: z.string().min(1),
  consentVersion: z.string().min(1).optional(),
});
export const loginSchema = z.object({ phone: z.string().min(1), password: z.string().min(1) });
export const adminLoginSchema = z.object({ email: z.string().min(1), password: z.string().min(1) });

export async function register(req, res) {
  res.status(201).json(await authService.registerFarmer(req.body));
}
export async function login(req, res) {
  res.json(await authService.loginFarmer(req.body));
}
export async function adminLogin(req, res) {
  res.json(await authService.adminLogin(req.body));
}
export async function refresh(req, res) {
  res.json(await authService.refreshTokens(req.body.refreshToken));
}
export async function logout(req, res) {
  res.json(await authService.logout(req.body.refreshToken));
}
export async function changePassword(req, res) {
  res.json(await authService.changePassword(req.user.doc, req.body));
}
