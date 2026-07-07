// Shared response serializers matching the pinned API contract shapes.
export const publicFarmer = (f) => ({
  id: f.id,
  name: f.name,
  phone: f.phone,
  village: f.village,
  state: f.state,
  district: f.district,
  status: f.status,
});

export const publicAdmin = (a) => ({ id: a.id, name: a.name, email: a.email, role: a.role });

export const publicSubscription = (s) => ({
  status: s.status,
  plan: s.plan,
  trialStartedAt: s.trialStartedAt,
  trialEndsAt: s.trialEndsAt,
  currentPeriodStart: s.currentPeriodStart,
  currentPeriodEnd: s.currentPeriodEnd,
  approvedAt: s.approvedAt,
  notes: s.notes,
});
