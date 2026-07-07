const COLORS = {
  pending_approval: '#BA7517',
  trial: '#185FA5',
  active: '#3B6D11',
  grace: '#993C1D',
  expired: '#5F5E5A',
  suspended: '#A32D2D',
  deactivated: '#A32D2D',
};

export default function StatusPill({ status }) {
  return (
    <span style={{ background: '#f1efe8', color: COLORS[status] || '#444', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
      {status}
    </span>
  );
}
