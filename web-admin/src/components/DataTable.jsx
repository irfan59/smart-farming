const th = { textAlign: 'left', borderBottom: '2px solid #eee', padding: '8px 10px', fontSize: 13 };
const td = { borderBottom: '1px solid #f0f0f0', padding: '8px 10px' };

export default function DataTable({ columns, rows, empty = 'No records', onRowClick }) {
  if (!rows || rows.length === 0) return <p>{empty}</p>;
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>{columns.map((c) => <th key={c.key} style={th}>{c.header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id || i} onClick={onRowClick ? () => onRowClick(r) : undefined} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
            {columns.map((c) => <td key={c.key} style={td}>{c.render ? c.render(r) : r[c.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
