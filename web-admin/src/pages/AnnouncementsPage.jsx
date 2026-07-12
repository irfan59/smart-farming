import { useState } from 'react';
import { useAnnouncements } from '../features/announcements/useAnnouncements';
import DataTable from '../components/DataTable';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Skeleton from '../components/ui/Skeleton';
import { cn } from '../lib/cn';

export default function AnnouncementsPage() {
  const { list, create } = useAnnouncements();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  function send(e) {
    e.preventDefault();
    if (!confirm('Send this announcement to all farmers?')) return;
    create.mutate({ title, body, audience: 'all' });
    setTitle('');
    setBody('');
  }

  const columns = [
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-slate-900">{r.title}</span> },
    { key: 'createdAt', header: 'Sent', render: (r) => new Date(r.createdAt).toLocaleString('en-IN') },
    {
      key: 'pushSent',
      header: 'Push',
      render: (r) => (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
            r.pushSent ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-slate-500 ring-slate-500/20',
          )}
        >
          {r.pushSent ? 'sent' : 'not sent'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast a message and push notification to all farmers." />

      <Card className="mb-6 p-6">
        <form onSubmit={send} className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short headline" required />
          <Textarea label="Body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your announcement…" required />
          <div className="flex justify-end">
            <Button type="submit" loading={create.isPending}>
              Send to all
            </Button>
          </div>
        </form>
      </Card>

      {list.isLoading ? (
        <Skeleton className="h-40" />
      ) : list.error ? (
        <Card className="p-6">
          <p role="alert" className="text-sm text-red-600">
            {list.error.message}
          </p>
        </Card>
      ) : (
        <DataTable columns={columns} rows={list.data.data} empty="No announcements" />
      )}
    </div>
  );
}
