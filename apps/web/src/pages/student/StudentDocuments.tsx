import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Select } from '../../components/ui/Input.js';
import { Icon } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { StatusBadge } from '../../components/ui/Badge.js';
import { useToast } from '../../components/ui/Toast.js';

type Doc = {
  id: string;
  kind: string;
  filename: string;
  status: string;
  uploaded_at: string;
};

const KIND_LABELS: Record<string, string> = {
  id: 'ID',
  transcript: 'Transcript',
  accommodation: 'Accommodation',
  enrollment_agreement: 'Enrollment agreement',
  reentry_doc: 'Re-entry doc',
  other: 'Other',
};

export function StudentDocuments(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: ['student-docs'],
    queryFn: () => api<{ items: Doc[] }>('/api/v1/documents'),
  });
  const [filename, setFilename] = useState('');
  const [kind, setKind] = useState('id');
  const submit = useMutation({
    mutationFn: () =>
      api('/api/v1/documents', {
        method: 'POST',
        body: JSON.stringify({
          filename,
          kind,
          storage_url: `https://storage.mcg.example/uploads/${encodeURIComponent(filename)}`,
          mime_type: 'application/pdf',
          size_bytes: 1024,
        }),
      }),
    onSuccess: () => {
      setFilename('');
      void qc.invalidateQueries({ queryKey: ['student-docs'] });
      toast.success('Document uploaded', 'Your coordinator will review it soon.');
    },
    onError: () => toast.error('Upload failed', 'Please try again.'),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="My documents"
        description="Upload IDs, accommodation paperwork, or anything else your coordinator asks for."
      />
      <Card className="p-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Type" required>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KIND_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="File name" required>
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="my-id.pdf"
                leftIcon={<Icon name="page" size={14} />}
              />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={() => submit.mutate()}
            disabled={!filename}
            loading={submit.isPending}
            leftIcon={<Icon name="upload" size={14} />}
          >
            Upload
          </Button>
        </div>
      </Card>

      {list.data?.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="folder" size={20} />}
          title="No documents yet"
          description="Anything you upload here is private to you and your support team."
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted bg-bg/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">File</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                  <td className="px-4 py-3">{KIND_LABELS[d.kind] ?? d.kind}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.filename}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
