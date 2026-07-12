import { cn } from '../lib/cn';

export default function DataTable({ columns, rows, empty = 'No records', onRowClick }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center text-sm text-slate-500">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr
                key={r.id || i}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-brand-50/40')}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-middle text-slate-700">
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
