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

const TERM_TYPES = [
  { value: 'year', label: 'Year' },
  { value: 'semester', label: 'Semester' },
  { value: 'trimester', label: 'Trimester' },
];

export default function TermsMastersPage() {
  const [orgId, setOrgId] = useState('');
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ term_type: 'year', number: 1, label: '' });
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [hasMore, setHasMore] = useState(false);
  const canCreate = useMemo(() => orgId && form.term_type && form.number && form.label, [orgId, form]);

  const loadTerms = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ orgId, limit: String(limit), page: String(page) });
      const res = await fetch(`/api/terms?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTerms(data.terms || []);
        setHasMore((data.terms || []).length === limit);
      } else {
        setError(data.error || 'Failed to load terms');
      }
    } catch (e) {
      setError(e.message || 'Failed to load terms');
    } finally {
      setLoading(false);
    }
  }, [orgId, page]);

  useEffect(() => {
    setTerms([]);
    setPage(1);
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadTerms();
  }, [orgId, page, loadTerms]);

  const createTerm = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/terms?orgId=${orgId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, number: Number(form.number), org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Object.values(data.errors || {}).join('\n') || data.error || 'Failed to create term');
        return;
      }
      setForm({ term_type: 'year', number: 1, label: '' });
      setPage(1);
      await loadTerms();
    } catch (e) {
      setError(e.message || 'Failed to create term');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark">Terms (Year/Semester)</h1>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 mt-1">Create and manage terms for the selected organization.</p>
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
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Create Term</h2>
          {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Type</label>
              <select
                value={form.term_type}
                onChange={(e) => setForm((p) => ({ ...p, term_type: e.target.value }))}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              >
                {TERM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Number</label>
              <input
                type="number"
                min={1}
                max={12}
                value={form.number}
                onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Label</label>
              <input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="I PUC / Semester 1"
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={createTerm}
                disabled={!canCreate || creating}
                className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded disabled:opacity-50 ${creating ? 'cursor-wait' : ''}`}
              >
                {creating ? 'Creating...' : 'Create Term'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Terms</h2>
          {!orgId ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Select an organization to view terms.</p>
          ) : loading ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Loading...</p>
          ) : terms.length === 0 ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">No terms found.</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-borderColor dark:divide-borderColor-dark">
                  {terms.map((t) => (
                    <li key={t.id} className="py-3">
                      <div className="font-medium text-textColor dark:text-textColor-dark">{t.label}</div>
                      <div className="text-xs text-contentColor dark:text-contentColor-dark">
                        {t.term_type} • #{t.number}
                      </div>
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


