import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

type Doc = {
  id: string;
  kind: string;
  filename: string;
  status: string;
  uploaded_at: string;
};

export function StudentDocuments(): JSX.Element {
  const qc = useQueryClient();
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
          // In production, the client first hits a presigned-URL endpoint
          // for object storage, then posts the resulting URL here.
          storage_url: `https://storage.mcg.example/uploads/${encodeURIComponent(filename)}`,
          mime_type: 'application/pdf',
          size_bytes: 1024,
        }),
      }),
    onSuccess: () => {
      setFilename('');
      void qc.invalidateQueries({ queryKey: ['student-docs'] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My documents</h1>
      <p className="text-sm text-zinc-500">
        Upload IDs, accommodation paperwork, or anything else your coordinator asks for.
      </p>
      <div className="bg-surface border border-zinc-800 rounded-lg p-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
          >
            <option value="id">ID</option>
            <option value="transcript">Transcript</option>
            <option value="accommodation">Accommodation</option>
            <option value="enrollment_agreement">Enrollment Agreement</option>
            <option value="reentry_doc">Re-entry document</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">File name</label>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="my-id.pdf"
            className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => submit.mutate()}
          disabled={!filename || submit.isPending}
          className="bg-accent text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          Upload
        </button>
      </div>
      <div className="bg-surface border border-zinc-800 rounded-lg">
        {list.data?.items.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">Nothing uploaded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">File</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((d) => (
                <tr key={d.id} className="border-b border-zinc-800/60">
                  <td className="px-4 py-3">{d.kind}</td>
                  <td className="px-4 py-3">{d.filename}</td>
                  <td className="px-4 py-3">{d.status}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
