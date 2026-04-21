'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import { subjectCatalogCreateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';
import { useUpsertSubject } from '@/hooks/api/useClassesSubjects.js';
import { useOrganizations, useProgramNodes } from '@/hooks/api/useDropdownData.js';

const CATEGORY_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'lab', label: 'Lab' },
  { value: 'mandatory', label: 'Mandatory' },
  { value: 'project', label: 'Project' },
  { value: 'internship', label: 'Internship' },
  { value: 'aecc', label: 'AECC' },
  { value: 'sec', label: 'SEC' },
  { value: 'open_elective', label: 'Open Elective' },
  { value: 'prof_elective', label: 'Professional Elective' },
];

const LEVEL_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'high_school', label: 'High School' },
  { value: 'puc', label: 'PUC' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'degree', label: 'Degree' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'post_graduation', label: 'Post Graduation' },
];

export default function CreateSubjectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const createAlert = useSweetAlert();
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role || 'superadmin';
  const userOrgId = user?.orgId;
  const initialOrgId = userRole === 'admin' ? userOrgId : (params.get('orgId') || '');

  const [orgId, setOrgId] = useState(initialOrgId);
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    category: '',
    credits: '',
    hours_per_week: '',
    level: '',
    department_node_id: '',
    syllabus_url: '',
    metadata: {},
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Use cached hooks for dropdown data
  const organizationsQuery = useOrganizations(
    { limit: 100 },
    { enabled: userRole === 'superadmin' }
  );

  const departmentsQuery = useProgramNodes(
    { orgId, node_type: 'department', limit: 100 },
    { enabled: Boolean(orgId) }
  );

  // Update organizations state from query
  useEffect(() => {
    if (organizationsQuery.data?.organizations) {
      setOrganizations(
        organizationsQuery.data.organizations.map((o) => ({ 
          value: o.id, 
          label: `${o.name} (${o.org_code})` 
        }))
      );
    }
  }, [organizationsQuery.data]);

  // Update departments state from query
  useEffect(() => {
    if (departmentsQuery.data?.nodes) {
      setDepartments(
        departmentsQuery.data.nodes.map((n) => ({ 
          value: n.id, 
          label: `${n.code} - ${n.title}` 
        }))
      );
    }
  }, [departmentsQuery.data]);

  const upsert = useUpsertSubject();

  const canSave = useMemo(() => {
    return Boolean(orgId && form.code && form.title && form.category && form.level);
  }, [orgId, form]);

  const handleSave = async () => {
    if (userRole === 'superadmin' && !orgId) {
      setErrors((prev) => ({ ...prev, org_id: 'Organization is required' }));
      createAlert('error', 'Please select organization');
      return;
    }

    const normalized = {
      ...form,
      org_id: orgId,
      credits: form.credits ? parseFloat(form.credits) : null,
      hours_per_week: form.hours_per_week ? parseFloat(form.hours_per_week) : null,
      department_node_id: form.department_node_id || null,
      syllabus_url: form.syllabus_url?.trim() ? form.syllabus_url.trim() : null,
      description: form.description?.trim() ? form.description.trim() : null,
      metadata: form.metadata && Object.keys(form.metadata).length > 0 ? form.metadata : null,
    };

    const validation = validateForm(subjectCatalogCreateSchema, {
      ...normalized,
    });

    if (!validation.success) {
      setErrors(validation.errors);
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[DEV] Subject create validation errors:', validation.errors);
      }
      createAlert('error', 'Please fix the validation errors');
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await upsert.mutateAsync({
        orgId,
        body: validation.data,
        method: 'POST',
      });
      createAlert('success', 'Subject created successfully');
      router.push(`/dashboards/superadmin-classes-subjects/subjects${orgId ? `?orgId=${orgId}` : ''}`);
    } catch (e) {
      createAlert('error', e.message || 'Failed to create subject');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-100px">
      <div className="mb-30px flex items-center justify-between">
        <h1 className="text-size-30 text-blackColor dark:text-blackColor-dark font-bold">Create Subject</h1>
        <div className="flex gap-10px">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded disabled:opacity-50 ${saving ? 'cursor-wait' : ''}`}
          >
            {saving ? 'Creating...' : 'Create Subject'}
          </button>
        </div>
      </div>

      <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
        {userRole === 'superadmin' && (
          <div className="mb-20px">
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
            >
              <option value="">Select organization</option>
              {organizations.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ValidationError error={errors.org_id} field="org_id" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-25px gap-y-20px">
          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${errors.code ? 'border-red-500 dark:border-red-500' : 'border-borderColor dark:border-borderColor-dark'} rounded uppercase`}
              placeholder="SUB001"
            />
            <ValidationError error={errors.code} field="code" />
          </div>

          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${errors.category ? 'border-red-500 dark:border-red-500' : 'border-borderColor dark:border-borderColor-dark'} rounded`}
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <ValidationError error={errors.category} field="category" />
          </div>

          <div className="md:col-span-2">
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${errors.title ? 'border-red-500 dark:border-red-500' : 'border-borderColor dark:border-borderColor-dark'} rounded`}
              placeholder="Subject Title"
            />
            <ValidationError error={errors.title} field="title" />
          </div>

          <div className="md:col-span-2">
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full p-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              placeholder="Subject description"
            />
          </div>

          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">Credits</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.credits}
              onChange={(e) => setForm((p) => ({ ...p, credits: e.target.value }))}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              placeholder="0"
            />
            <ValidationError error={errors.credits} field="credits" />
          </div>

          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">Hours/Week</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.hours_per_week}
              onChange={(e) => setForm((p) => ({ ...p, hours_per_week: e.target.value }))}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              placeholder="0"
            />
            <ValidationError error={errors.hours_per_week} field="hours_per_week" />
          </div>

          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">Level <span className="text-red-500">*</span></label>
            <select
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
              className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${errors.level ? 'border-red-500 dark:border-red-500' : 'border-borderColor dark:border-borderColor-dark'} rounded`}
            >
              <option value="">Select level</option>
              {LEVEL_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <ValidationError error={errors.level} field="level" />
          </div>

          <div>
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">Department</label>
            <select
              value={form.department_node_id}
              onChange={(e) => setForm((p) => ({ ...p, department_node_id: e.target.value }))}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              disabled={!orgId && userRole === 'superadmin'}
            >
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <ValidationError error={errors.department_node_id} field="department_node_id" />
          </div>

          <div className="md:col-span-2">
            <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">Syllabus URL</label>
            <input
              type="url"
              value={form.syllabus_url}
              onChange={(e) => setForm((p) => ({ ...p, syllabus_url: e.target.value }))}
              className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded"
              placeholder="https://example.com/syllabus.pdf"
            />
            <ValidationError error={errors.syllabus_url} field="syllabus_url" />
          </div>
        </div>
      </div>
    </div>
  );
}


