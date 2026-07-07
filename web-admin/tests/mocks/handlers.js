import { http, HttpResponse } from 'msw';

const B = '*/api';

// Default happy-path handlers matching API-CONTRACT.md. Tests override per-case with server.use(...).
export const handlers = [
  http.post(`${B}/auth/admin/login`, async ({ request }) => {
    const { email } = await request.json();
    return HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', admin: { id: 'adm_1', name: 'Owner', email, role: 'superadmin' } });
  }),
  http.get(`${B}/admin/me`, () => HttpResponse.json({ admin: { id: 'adm_1', name: 'Owner', email: 'owner@farm.in', role: 'superadmin' } })),
  http.post(`${B}/auth/refresh`, () => HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' })),
  http.post(`${B}/auth/logout`, () => HttpResponse.json({ ok: true })),
  http.get(`${B}/admin/dashboard`, () =>
    HttpResponse.json({
      pendingApprovals: 2,
      farmersByStatus: { active: 10, suspended: 1, deactivated: 0 },
      subscriptionsByStatus: { pending_approval: 2, trial: 3, active: 8, grace: 1, expired: 0 },
      activeSubscriptions: 11,
      revenueThisMonth: 990,
      revenueTotal: 12870,
    })),
];
