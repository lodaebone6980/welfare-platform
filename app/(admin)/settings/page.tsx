'use client';

import { useEffect, useState } from 'react';

type ApiSource = {
  id: number;
  name: string;
  url: string;
  type: string;
  status: string;
  lastSuccess: string | null;
  todayCount: number;
  totalCount: number;
};

type FormState = { id?: number; name: string; url: string; type: string; status: string };

const EMPTY: FormState = { name: '', url: '', type: 'REST', status: 'active' };

export default function SettingsPage() {
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/api-source', { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'load failed');
      setSources(data.sources);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? '\ub85c\ub4dc \uc2e4\ud328');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function openCreate() { setForm(EMPTY); setOpen(true); }
  function openEdit(s: ApiSource) {
    setForm({ id: s.id, name: s.name, url: s.url, type: s.type, status: s.status });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = typeof form.id === 'number';
      const endpoint = isEdit ? "/api/admin/api-source/" + form.id : '/api/admin/api-source';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '\uc800\uc7a5 \uc2e4\ud328');
      setOpen(false);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? '\uc800\uc7a5 \uc2e4\ud328');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('\uc774 API \uc18c\uc2a4\ub97c \uc0ad\uc81c\ud560\uae4c\uc694? (\uc218\uc9d1 \uc774\ub825\uc740 \ubcf4\uc874\ub418\uc9c0 \uc54a\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4)')) return;
    const res = await fetch("/api/admin/api-source/" + id, { method: 'DELETE' });
    const data = await res.json();
    if (!data.ok) alert(data.error ?? '\uc0ad\uc81c \uc2e4\ud328');
    await refresh();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">\uc124\uc815</h1>
          <p className="text-xs text-gray-500 mt-1">API \uc18c\uc2a4 \uad00\ub9ac \ubc0f \uc2dc\uc2a4\ud15c \uc124\uc815</p>
        </div>
        <button onClick={openCreate} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
          + API \uc18c\uc2a4 \ucd94\uac00
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">\ub4f1\ub85d\ub41c API \uc18c\uc2a4</div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">\ubd88\ub7ec\uc624\ub294 \uc911...</div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">\ub4f1\ub85d\ub41c API \uc18c\uc2a4\uac00 \uc5c6\uc2b5\ub2c8\ub2e4. "+ API \uc18c\uc2a4 \ucd94\uac00"\ub97c \ub20c\ub7ec\uc8fc\uc138\uc694.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 font-normal">\uc774\ub984</th>
                <th className="px-4 py-2 font-normal hidden sm:table-cell">URL</th>
                <th className="px-4 py-2 font-normal hidden md:table-cell">\ud0c0\uc785</th>
                <th className="px-4 py-2 font-normal">\uc0c1\ud0dc</th>
                <th className="px-4 py-2 font-normal text-right">\uad00\ub9ac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell truncate max-w-[260px]" title={s.url}>{s.url}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.type}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium " + (s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600')}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">\uc218\uc815</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:underline">\uc0ad\uc81c</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 p-4 rounded-xl border border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">\uacc4\uc815 \ubc0f \ubcf4\uc548</h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          \uad00\ub9ac\uc790 \ube44\ubc00\ubc88\ud638 \ubcc0\uacbd\uc740 Vercel \ud658\uacbd\ubcc0\uc218 <code className="px-1 py-0.5 bg-gray-100 rounded">ADMIN_PASSWORD_HASH</code>\ub97c \uc804\ub2ec\uc73c\ub85c \uac31\uc2e0\ud558\uc154\uc57c \ud569\ub2c8\ub2e4.
          \uc720\uc9c0\ubcf4\uc218 \uace0\ub824\uc0ac\ud56d\uc73c\ub85c \ud610\uc758 \uc911\uc785\ub2c8\ub2e4.
        </p>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSave} className="w-full max-w-md bg-white rounded-xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{form.id ? 'API \uc18c\uc2a4 \uc218\uc815' : 'API \uc18c\uc2a4 \ucd94\uac00'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="\ub2eb\uae30">\u2715</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">\uc774\ub984</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm" placeholder="\uc608: \uc815\ubd80\uc9c0\uc6d0\uae08 OpenAPI" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">URL</label>
                <input required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm" placeholder="https://api.odcloud.kr/..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">\ud0c0\uc785</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm">
                    <option value="REST">REST</option>
                    <option value="GRAPHQL">GRAPHQL</option>
                    <option value="RSS">RSS</option>
                    <option value="SCRAPE">SCRAPE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">\uc0c1\ud0dc</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm">
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg text-sm text-gray-700 hover:bg-gray-50">\ucde8\uc18c</button>
              <button disabled={saving} className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? '\uc800\uc7a5 \uc911...' : '\uc800\uc7a5'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
