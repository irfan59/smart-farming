import { useState } from 'react';
import { useAnnouncements } from '../features/announcements/useAnnouncements';
import DataTable from '../components/DataTable';

export default function AnnouncementsPage() {
  const { list, create } = useAnnouncements();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  if (list.isLoading) return <p>Loading…</p>;
  if (list.error) return <p role="alert">{list.error.message}</p>;

  function send(e) {
    e.preventDefault();
    if (!confirm('Send this announcement to all farmers?')) return;
    create.mutate({ title, body, audience: 'all' });
    setTitle('');
    setBody('');
  }

  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'createdAt', header: 'Sent', render: (r) => new Date(r.createdAt).toLocaleString('en-IN') },
    { key: 'pushSent', header: 'Push', render: (r) => (r.pushSent ? 'sent' : 'not sent') },
  ];

  return (
    <div>
      <h1>Announcements</h1>
      <form onSubmit={send} style={{ marginBottom: 12 }}>
        <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <textarea aria-label="Body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" required />
        <button type="submit" disabled={create.isPending}>Send</button>
      </form>
      <DataTable columns={columns} rows={list.data.data} empty="No announcements" />
    </div>
  );
}
