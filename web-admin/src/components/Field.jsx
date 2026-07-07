export default function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ display: 'block', fontSize: 13, color: '#555' }}>{label}</span>
      {children}
    </label>
  );
}
