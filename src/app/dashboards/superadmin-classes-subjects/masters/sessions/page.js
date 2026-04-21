'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';

function OrgSelect({ value, onChange }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, limit: '50' });
      const res = await fetch(`/api/organizations?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setOptions(data.organizations.map((o) => ({ value: o.id, label: `${o.name} (${o.org_code})` })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      {loading && <p className="text-xs mt-1 text-contentColor/70 dark:text-contentColor-dark/70">Loading organizations...</p>}
    </div>
  );
}

export default function SessionsMastersPage() {
  const [orgId, setOrgId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: '', start_date: '', end_date: '', is_current: false });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 10;

  const canCreate = useMemo(() => {
    return orgId && form.code && form.start_date && form.end_date;
  }, [orgId, form]);

  const loadSessions = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId, limit: String(limit), page: String(page) });
      const res = await fetch(`/api/academic-sessions?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
        setTotalPages(data.pagination?.pages || 0);
      } else {
        setError(data.error || 'Failed to load sessions');
      }
    } catch (e) {
      setError(e.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [orgId, page]);

  useEffect(() => {
    setSessions([]);
    setPage(1);
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadSessions();
  }, [orgId, page, loadSessions]);

  const createSession = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/academic-sessions?orgId=${orgId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Object.values(data.errors || {}).join('\n') || data.error || 'Failed to create session');
        return;
      }
      setForm({ code: '', start_date: '', end_date: '', is_current: false });
      // refresh first page to show newest on top
      setPage(1);
      await loadSessions();
    } catch (e) {
      setError(e.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark">Academic Sessions</h1>
            <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 mt-1">
              Create and manage academic sessions for the selected organization.
            </p>
          </div>
          <Link href="/dashboards/superadmin-classes-subjects/masters" className="text-primaryColor hover:underline text-sm">
            Back to Masters
          </Link>
        </div>
      </div>

      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px mb-6">
        <OrgSelect value={orgId} onChange={setOrgId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Create Session</h2>
          {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="2025-26"
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full h-52px leading-52px pl-5 pr-3 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full h-52px leading-52px pl-5 pr-3 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="is_current"
                type="checkbox"
                checked={form.is_current}
                onChange={(e) => setForm((p) => ({ ...p, is_current: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="is_current" className="text-sm text-contentColor dark:text-contentColor-dark">Set as current session</label>
            </div>
            <div className="md:col-span-2">
              <button
                onClick={createSession}
                disabled={!canCreate || creating}
                className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded disabled:opacity-50 ${creating ? 'cursor-wait' : ''}`}
              >
                {creating ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Sessions</h2>
          {!orgId ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Select an organization to view sessions.</p>
          ) : loading ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">No sessions found.</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-borderColor dark:divide-borderColor-dark">
                  {sessions.map((s) => (
                    <li key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-textColor dark:text-textColor-dark">{s.code}</div>
                        <div className="text-xs text-contentColor dark:text-contentColor-dark">
                          {new Date(s.start_date).toLocaleDateString()} — {new Date(s.end_date).toLocaleDateString()}
                          {s.is_current ? ' • Current' : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center gap-10px">
                  <button
                    className="px-12px py-6px border border-borderColor rounded disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-contentColor dark:text-contentColor-dark">Page {page} of {totalPages}</span>
                  <button
                    className="px-12px py-6px border border-borderColor rounded disabled:opacity-50"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


