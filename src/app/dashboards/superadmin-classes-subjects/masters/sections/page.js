'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

function OrgSelect({ value, onChange }) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/organizations?limit=50`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setOptions(data.organizations.map((o) => ({ value: o.id, label: `${o.name} (${o.org_code})` })));
      }
    })();
  }, []);
  return (
    <div>
      <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Organization</label>
      <select
        className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select organization...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function SectionsMastersPage() {
  const [orgId, setOrgId] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ label: '', capacity: 60 });
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [hasMore, setHasMore] = useState(false);

  const canCreate = useMemo(() => orgId && form.label, [orgId, form]);

  const loadSections = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ orgId, limit: String(limit), page: String(page) });
      const res = await fetch(`/api/sections?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSections(data.sections || []);
        setHasMore((data.sections || []).length === limit);
      } else {
        setError(data.error || 'Failed to load sections');
      }
    } catch (e) {
      setError(e.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, [orgId, page]);

  useEffect(() => {
    setSections([]);
    setPage(1);
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadSections();
  }, [orgId, page, loadSections]);

  const createSection = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/sections?orgId=${orgId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: Number(form.capacity) || 0, org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Object.values(data.errors || {}).join('\n') || data.error || 'Failed to create section');
        return;
      }
      setForm({ label: '', capacity: 60 });
      setPage(1);
      await loadSections();
    } catch (e) {
      setError(e.message || 'Failed to create section');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark">Sections</h1>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 mt-1">Create and manage sections for the selected organization.</p>
        </div>
        <Link href="/dashboards/superadmin-classes-subjects/masters" className="text-primaryColor hover:underline text-sm">
          Back to Masters
        </Link>
      </div>

      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px mb-6">
        <OrgSelect value={orgId} onChange={setOrgId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Create Section</h2>
          {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Label</label>
              <input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value.toUpperCase() }))}
                placeholder="A"
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded uppercase"
              />
            </div>
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Capacity</label>
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={createSection}
                disabled={!canCreate || creating}
                className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded disabled:opacity-50 ${creating ? 'cursor-wait' : ''}`}
              >
                {creating ? 'Creating...' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Sections</h2>
          {!orgId ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Select an organization to view sections.</p>
          ) : loading ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Loading...</p>
          ) : sections.length === 0 ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">No sections found.</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-borderColor dark:divide-borderColor-dark">
                  {sections.map((s) => (
                    <li key={s.id} className="py-3 flex items-center justify-between">
                      <div className="font-medium text-textColor dark:text-textColor-dark">{s.label}</div>
                      {typeof s.capacity === 'number' && (
                        <div className="text-xs text-contentColor dark:text-contentColor-dark">Capacity: {s.capacity}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex items-center gap-10px">
                <button
                  className="px-12px py-6px border border-borderColor rounded disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span className="text-sm text-contentColor dark:text-contentColor-dark">Page {page}</span>
                <button
                  className="px-12px py-6px border border-borderColor rounded disabled:opacity-50"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


