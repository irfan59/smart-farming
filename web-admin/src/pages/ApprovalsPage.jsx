import { useFarmers } from '../features/farmers/useFarmers';
import { useApprove } from '../features/farmers/useApprove';
import DataTable from '../components/DataTable';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';

export default function ApprovalsPage() {
  const { data, isLoading, error } = useFarmers({ status: 'pending_approval' });
  const approve = useApprove();

  const columns = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'village', header: 'Village' },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => approve.mutate(r.id)}
            loading={approve.isPending && approve.variables === r.id}
          >
            Approve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Pending approvals" subtitle="Review and activate farmers who have registered." />
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : error ? (
        <Card className="p-6">
          <p role="alert" className="text-sm text-red-600">
            {error.message}
          </p>
        </Card>
      ) : (
        <DataTable columns={columns} rows={data.data} empty="No pending farmers" />
      )}
    </div>
  );
}
