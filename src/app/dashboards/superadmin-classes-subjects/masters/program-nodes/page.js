'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// Default levels (fallback if organization has none)
const DEFAULT_LEVELS = ['primary','high_school','puc','diploma','degree','engineering','post_graduation'];

const NODE_TYPES = [
  { value: 'grade', label: 'Grade' },
  { value: 'stream', label: 'Stream' },
  { value: 'combination', label: 'Combination' },
  { value: 'programme', label: 'Programme' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'department', label: 'Department' },
  { value: 'branch', label: 'Branch' },
];

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

export default function ProgramNodesMastersPage() {
  const [orgId, setOrgId] = useState('');
  const [level, setLevel] = useState('');
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgLevels, setOrgLevels] = useState(DEFAULT_LEVELS);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [hasMore, setHasMore] = useState(false);

  const [form, setForm] = useState({
    level: '',
    node_type: 'stream',
    code: '',
    title: '',
    parent_id: '',
  });

  const canCreate = useMemo(() => {
    return orgId && form.level && form.node_type && form.code && form.title;
  }, [orgId, form]);

  const loadNodes = useCallback(async () => {
    if (!orgId || !level) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ orgId, level, limit: String(limit), page: String(page) });
      const res = await fetch(`/api/program-nodes?${params}`, { credentials: 'include' });
      if (res.status === 503) {
        setError('Database is busy. Please wait a moment and try again.');
        setNodes([]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNodes(data.nodes || []);
        setHasMore((data.nodes || []).length === limit);
      } else {
        setError(data.error || 'Failed to load program nodes');
      }
    } catch (e) {
      setError(e.message || 'Failed to load program nodes');
    } finally {
      setLoading(false);
    }
  }, [orgId, level, page]);

  useEffect(() => {
    setNodes([]);
    setPage(1);
  }, [orgId, level]);

  useEffect(() => {
    if (orgId && level) loadNodes();
  }, [orgId, level, page, loadNodes]);

  // Fetch organization to get allowed academic levels when org changes
  useEffect(() => {
    if (!orgId) {
      setOrgLevels(DEFAULT_LEVELS);
      setLevel('');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/organizations/${orgId}`, { credentials: 'include' });
        const data = await res.json();
        if (data?.success && Array.isArray(data.organization?.academic_levels) && data.organization.academic_levels.length > 0) {
          setOrgLevels(data.organization.academic_levels);
          // Ensure currently selected level is valid
          if (!data.organization.academic_levels.includes(level)) {
            setLevel('');
          }
        } else {
          setOrgLevels(DEFAULT_LEVELS);
        }
      } catch (_e) {
        setOrgLevels(DEFAULT_LEVELS);
      }
    })();
  }, [orgId]);  

  const createNode = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/program-nodes?orgId=${orgId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          parent_id: form.parent_id || null,
          code: form.code.toUpperCase(),
          org_id: orgId,
        }),
      });
      if (res.status === 503) {
        setError('Database is busy. Please try again shortly.');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(Object.values(data.errors || {}).join('\n') || data.error || 'Failed to create program node');
        return;
      }
      setForm({ level: form.level, node_type: form.node_type, code: '', title: '', parent_id: '' });
      setPage(1);
      await loadNodes();
    } catch (e) {
      setError(e.message || 'Failed to create program node');
    } finally {
      setCreating(false);
    }
  };

  const parentCandidates = useMemo(() => {
    if (!nodes || !form.level) return [];
    // Parent is typically stream for combination, faculty for programme etc. Keep simple: all nodes of same level can be parents.
    return nodes.map((n) => ({ value: n.id, label: `${n.code} - ${n.title}` }));
  }, [nodes, form.level]);

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark">Program Nodes</h1>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 mt-1">Create and manage program hierarchy like streams, combinations, grades, etc.</p>
        </div>
        <Link href="/dashboards/superadmin-classes-subjects/masters" className="text-primaryColor hover:underline text-sm">
          Back to Masters
        </Link>
      </div>

      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <OrgSelect value={orgId} onChange={setOrgId} />
          <div>
            <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setForm((p) => ({ ...p, level: e.target.value }));
              }}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
            >
              <option value="">Select level...</option>
              {orgLevels.map((l) => (
                <option key={l} value={l}>{l.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Create Node</h2>
          {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Type</label>
              <select
                value={form.node_type}
                onChange={(e) => setForm((p) => ({ ...p, node_type: e.target.value }))}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              >
                {NODE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Parent (optional)</label>
              <select
                value={form.parent_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))}
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              >
                <option value="">None</option>
                {parentCandidates.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="SCI / PCMC"
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded uppercase"
              />
            </div>
            <div>
              <label className="block text-sm text-contentColor dark:text-contentColor-dark mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Science / Physics, Chemistry, Mathematics, Computer Science"
                className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={createNode}
                disabled={!canCreate || creating}
                className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded disabled:opacity-50 ${creating ? 'cursor-wait' : ''}`}
              >
                {creating ? 'Creating...' : 'Create Node'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Nodes</h2>
          {!orgId || !level ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Select organization and level to view nodes.</p>
          ) : loading ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">Loading...</p>
          ) : nodes.length === 0 ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">No nodes found.</p>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-borderColor dark:divide-borderColor-dark">
                  {nodes.map((n) => (
                    <li key={n.id} className="py-3">
                      <div className="font-medium text-textColor dark:text-textColor-dark">{n.code} — {n.title}</div>
                      <div className="text-xs text-contentColor dark:text-contentColor-dark">{n.node_type}{n.parent_id ? ' • has parent' : ''}</div>
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


