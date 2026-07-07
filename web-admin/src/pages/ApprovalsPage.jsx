import { useFarmers } from '../features/farmers/useFarmers';
import { useApprove } from '../features/farmers/useApprove';
import DataTable from '../components/DataTable';

export default function ApprovalsPage() {
  const { data, isLoading, error } = useFarmers({ status: 'pending_approval' });
  const approve = useApprove();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error.message}</p>;

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'village', header: 'Village' },
    {
      key: 'actions',
      header: '',
      render: (r) => <button onClick={() => approve.mutate(r.id)} disabled={approve.isPending}>Approve</button>,
    },
  ];

  return (
    <div>
      <h1>Pending approvals</h1>
      <DataTable columns={columns} rows={data.data} empty="No pending farmers" />
    </div>
  );
}
