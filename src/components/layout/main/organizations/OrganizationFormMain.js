/**
 * Organization Form Main Component
 * 
 * Main form component for creating/editing organizations.
 * Includes all fields, validation, image upload, and responsive design.
 * 
 * @module main/organizations/OrganizationFormMain
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSweetAlert from '@/hooks/useSweetAlert';
import { organizationCreateSchema, organizationUpdateSchema, validateForm } from '@/lib/validation/organizationSchemas.js';
import { slugify } from '@/lib/validation/organizationValidators.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';
import ImagePicker from '@/components/shared/forms/ImagePicker.js';
import FormSelectAsync from '@/components/shared/forms/FormSelectAsync.js';
import FormMultiSelect from '@/components/shared/forms/FormMultiSelect.js';
import OrgDomainPanel from './OrgDomainPanel.jsx';

// Human-friendly field labels for error summaries
const FIELD_LABELS = {
  name: 'Organization Name',
  slug: 'Slug',
  org_type: 'Organization Type',
  display_name: 'Display Name',
  org_code: 'Organization Code',
  country: 'Country',
  state: 'State/Province',
  city: 'City',
  timezone: 'Timezone',
  default_locale: 'Default Locale',
  currency: 'Currency',
  academic_year_start_month: 'Academic Year Start Month',
  academic_levels: 'Academic Levels',
  'primary_admin': 'Primary Administrator',
  'primary_admin.name': 'Admin Name',
  'primary_admin.email': 'Admin Email',
  contact_email: 'Contact Email',
  contact_phone: 'Contact Phone',
  website_url: 'Website URL',
  status: 'Status',
  'brand_assets': 'Brand Assets',
};

const formatFieldLabel = (path) => {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  // Fallback: title-case last segment of path
  const last = String(path).split('.').pop();
  return last
    ? last.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : String(path);
};

// Organization types
const ORG_TYPES = [
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'institute', label: 'Institute' },
  { value: 'department', label: 'Department' },
  { value: 'training_center', label: 'Training Center' },
];

// Academic levels
const ACADEMIC_LEVELS = [
  { value: 'primary', label: 'Primary' },
  { value: 'high_school', label: 'High School' },
  { value: 'puc', label: 'PUC' },
  { value: 'degree', label: 'Degree' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'post_graduation', label: 'Post Graduation' },
];

// Months
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
}));

// Load timezones (simplified - in production, fetch from API or use a library)
const loadTimezones = async (searchTerm = '') => {
  // Simplified timezone list - in production, use a timezone library or API
  const timezones = [
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Australia/Sydney',
  ];

  const filtered = timezones.filter((tz) => tz.toLowerCase().includes(searchTerm.toLowerCase()));
  return filtered.map((tz) => ({ value: tz, label: tz }));
};

// Load currencies (simplified)
const loadCurrencies = async (searchTerm = '') => {
  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];
  const filtered = currencies.filter((curr) => curr.toLowerCase().includes(searchTerm.toLowerCase()));
  return filtered.map((curr) => ({ value: curr, label: curr }));
};

/**
 * Organization Form Main Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.organization - Existing organization (for edit mode)
 */
export default function OrganizationFormMain({ organization = null }) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const isEditMode = !!organization;
  const formRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    slug: organization?.slug || '',
    org_type: organization?.org_type || '',
    display_name: organization?.display_name || '',
    org_code: organization?.org_code || '',
    country: organization?.country || '',
    state: organization?.state || '',
    city: organization?.city || '',
    timezone: organization?.timezone || 'Asia/Kolkata',
    default_locale: organization?.default_locale || 'en-IN',
    currency: organization?.currency || 'INR',
    academic_year_start_month: organization?.academic_year_start_month || 6,
    academic_levels: organization?.academic_levels || [],
    primary_admin: {
      name: organization?.primary_admin_name || '',
      email: organization?.primary_admin_email || '',
    },
    contact_email: organization?.contact_email || '',
    contact_phone: organization?.contact_phone || '',
    website_url: organization?.website_url || '',
    status: organization?.status || 'active',
    plan_tier: organization?.plan_tier || 'basic',
    brand_assets: organization?.brand_assets || [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(!isEditMode);

  // Auto-generate slug from name
  useEffect(() => {
    if (autoGenerateSlug && formData.name && !isEditMode) {
      const generatedSlug = slugify(formData.name);
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, autoGenerateSlug, isEditMode]);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle brand asset change
  const handleBrandAssetChange = (keyName, url) => {
    setFormData((prev) => {
      const brandAssets = [...(prev.brand_assets || [])];
      const existingIndex = brandAssets.findIndex((asset) => asset.key_name === keyName);

      if (url) {
        const asset = {
          key_name: keyName,
          url,
          variant: 'default',
        };

        if (existingIndex >= 0) {
          brandAssets[existingIndex] = asset;
        } else {
          brandAssets.push(asset);
        }
      } else {
        if (existingIndex >= 0) {
          brandAssets.splice(existingIndex, 1);
        }
      }

      return { ...prev, brand_assets: brandAssets };
    });
  };

  // Get brand asset URL
  const getBrandAssetUrl = (keyName) => {
    const asset = formData.brand_assets?.find((a) => a.key_name === keyName);
    return asset?.url || '';
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const schema = isEditMode ? organizationUpdateSchema : organizationCreateSchema;
    const validation = validateForm(schema, formData);

    if (!validation.success) {
      setErrors(validation.errors);
      // Build a concise alert with first 3 errors
      const entries = Object.entries(validation.errors).filter(([k]) => k !== 'general');
      const messages = entries.map(([, msg]) => String(msg)).filter(Boolean);
      const alertMessage = messages.slice(0, 3).join('\n') || 'Please fill in all required fields correctly';
      createAlert('error', alertMessage);
      // Scroll to form for visibility
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const url = isEditMode ? `/api/organizations/${organization.id}` : '/api/organizations';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(validation.data),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
          // Build a user-friendly message from field errors (first 3)
          const entries = Object.entries(data.errors).filter(([k]) => k !== 'general');
          const fieldMessages = entries.map(([, msg]) => String(msg)).filter(Boolean);
          if (fieldMessages.length > 0) createAlert('error', fieldMessages.slice(0, 3).join('\n'));
          if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        throw new Error(data.error || 'Failed to save organization');
      }

      createAlert('success', isEditMode ? 'Organization updated successfully' : 'Organization created successfully');
      router.push('/dashboards/superadmin-organizations');
    } catch (error) {
      console.error('Form submission error:', error);
      createAlert('error', error.message || 'Failed to save organization');
      setErrors({ general: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-100px">
      <div className="mb-30px">
        <h1 className="text-size-30 text-blackColor dark:text-blackColor-dark font-bold mb-10px">
          {isEditMode ? 'Edit Organization' : 'Create Organization'}
        </h1>
        <p className="text-contentColor dark:text-contentColor-dark text-sm">
          {isEditMode ? 'Update organization information' : 'Fill in the details to create a new organization'}
        </p>
      </div>

      {errors.general && (
        <ErrorDisplay error={errors.general} type="inline" variant="error" className="mb-25px" />
      )}

      {/* Error summary */}
      {Object.keys(errors).filter((k) => k !== 'general').length > 0 && (
        <div className="mb-25px border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 rounded p-15px">
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-10px">
            Please fix the following errors:
          </p>
          <ul className="list-disc pl-20px space-y-5px">
            {Object.entries(errors)
              .filter(([key]) => key !== 'general')
              .map(([key, message]) => (
                <li key={key} className="text-sm text-red-700 dark:text-red-300">
                  <span className="font-semibold">{formatFieldLabel(key)}:</span> {String(message)}
                </li>
              ))}
          </ul>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-30px">
        {/* Basic Info Section */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-25px gap-y-20px">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.name
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="Enter organization name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              <ValidationError error={errors.name} field="name" />
            </div>

            {/* Slug */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-10px mb-10px">
                <label className="text-contentColor dark:text-contentColor-dark block text-sm font-medium">
                  Slug <span className="text-red-500">*</span>
                </label>
                {!isEditMode && (
                  <label className="flex items-center gap-5px text-xs text-contentColor dark:text-contentColor-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerateSlug}
                      onChange={(e) => setAutoGenerateSlug(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Auto-generate from name
                  </label>
                )}
              </div>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                disabled={autoGenerateSlug && !isEditMode}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.slug
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded ${
                  autoGenerateSlug && !isEditMode ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder="example-university"
                aria-invalid={!!errors.slug}
                aria-describedby={errors.slug ? 'slug-error' : undefined}
              />
              <ValidationError error={errors.slug} field="slug" />
            </div>

            {/* Org Type */}
            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Organization Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.org_type}
                onChange={(e) => handleChange('org_type', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.org_type
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } rounded font-medium`}
                aria-invalid={!!errors.org_type}
                aria-describedby={errors.org_type ? 'org_type-error' : undefined}
              >
                <option value="">Select type</option>
                {ORG_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ValidationError error={errors.org_type} field="org_type" />
            </div>

            {/* Display Name */}
            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Display Name
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => handleChange('display_name', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="Optional display name"
              />
            </div>

            {/* Org Code */}
            <div className="md:col-span-2">
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Organization Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.org_code}
                onChange={(e) => handleChange('org_code', e.target.value.toUpperCase())}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.org_code
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded uppercase`}
                placeholder="EXU001"
                maxLength={8}
                aria-invalid={!!errors.org_code}
                aria-describedby={errors.org_code ? 'org_code-error' : undefined}
              />
              <ValidationError error={errors.org_code} field="org_code" />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Location</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-25px gap-y-20px">
            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.country
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="India"
                aria-invalid={!!errors.country}
                aria-describedby={errors.country ? 'country-error' : undefined}
              />
              <ValidationError error={errors.country} field="country" />
            </div>

            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                State/Province <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.state
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="Karnataka"
                aria-invalid={!!errors.state}
                aria-describedby={errors.state ? 'state-error' : undefined}
              />
              <ValidationError error={errors.state} field="state" />
            </div>

            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.city
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="Bangalore"
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? 'city-error' : undefined}
              />
              <ValidationError error={errors.city} field="city" />
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-25px gap-y-20px">
            <FormSelectAsync
              label="Timezone"
              name="timezone"
              value={formData.timezone}
              onChange={(value) => handleChange('timezone', value)}
              loadOptions={loadTimezones}
              error={errors.timezone}
              placeholder="Select timezone"
            />

            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Default Locale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.default_locale}
                onChange={(e) => handleChange('default_locale', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.default_locale
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="en-IN"
                aria-invalid={!!errors.default_locale}
                aria-describedby={errors.default_locale ? 'default_locale-error' : undefined}
              />
              <ValidationError error={errors.default_locale} field="default_locale" />
            </div>

            <FormSelectAsync
              label="Currency"
              name="currency"
              value={formData.currency}
              onChange={(value) => handleChange('currency', value)}
              loadOptions={loadCurrencies}
              error={errors.currency}
              placeholder="Select currency"
            />

            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Academic Year Start Month <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.academic_year_start_month}
                onChange={(e) => handleChange('academic_year_start_month', parseInt(e.target.value, 10))}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.academic_year_start_month
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } rounded font-medium`}
                aria-invalid={!!errors.academic_year_start_month}
                aria-describedby={errors.academic_year_start_month ? 'academic_year_start_month-error' : undefined}
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <ValidationError error={errors.academic_year_start_month} field="academic_year_start_month" />
            </div>

            <div className="md:col-span-2">
              <FormMultiSelect
                label="Academic Levels"
                name="academic_levels"
                value={formData.academic_levels}
                onChange={(value) => handleChange('academic_levels', value)}
                options={ACADEMIC_LEVELS}
                error={errors.academic_levels}
                placeholder="Select academic levels"
              />
            </div>
          </div>
        </div>

        {/* Primary Admin Section */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Primary Administrator</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-25px gap-y-20px">
            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Admin Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.primary_admin.name}
                onChange={(e) => handleChange('primary_admin.name', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors['primary_admin.name'] || errors['primary_admin']
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="John Doe"
                aria-invalid={!!(errors['primary_admin.name'] || errors['primary_admin'])}
                aria-describedby={errors['primary_admin.name'] || errors['primary_admin'] ? 'primary_admin-name-error' : undefined}
              />
              <ValidationError error={errors['primary_admin.name'] || errors['primary_admin']?.name} field="primary_admin.name" />
            </div>

            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Admin Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.primary_admin.email}
                onChange={(e) => handleChange('primary_admin.email', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors['primary_admin.email'] || errors['primary_admin']
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="john.doe@example.edu"
                aria-invalid={!!(errors['primary_admin.email'] || errors['primary_admin'])}
                aria-describedby={errors['primary_admin.email'] || errors['primary_admin'] ? 'primary_admin-email-error' : undefined}
              />
              <ValidationError error={errors['primary_admin.email'] || errors['primary_admin']?.email} field="primary_admin.email" />
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Contact Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-25px gap-y-20px">
            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.contact_email
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="contact@example.edu"
                aria-invalid={!!errors.contact_email}
                aria-describedby={errors.contact_email ? 'contact_email-error' : undefined}
              />
              <ValidationError error={errors.contact_email} field="contact_email" />
            </div>

            <div>
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.contact_phone
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="+91-80-12345678"
                aria-invalid={!!errors.contact_phone}
                aria-describedby={errors.contact_phone ? 'contact_phone-error' : undefined}
              />
              <ValidationError error={errors.contact_phone} field="contact_phone" />
            </div>

            <div className="md:col-span-2">
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                Website URL
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                className={`w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border ${
                  errors.website_url
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-borderColor dark:border-borderColor-dark'
                } placeholder:text-placeholder placeholder:opacity-80 font-medium rounded`}
                placeholder="https://example.edu"
                aria-invalid={!!errors.website_url}
                aria-describedby={errors.website_url ? 'website_url-error' : undefined}
              />
              <ValidationError error={errors.website_url} field="website_url" />
            </div>
          </div>
        </div>

        {/* Brand Assets Section */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Brand Assets</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-25px gap-y-20px">
            <ImagePicker
              label="Header Logo URL"
              name="header_logo_url"
              value={getBrandAssetUrl('header_logo')}
              onChange={(url) => handleBrandAssetChange('header_logo', url)}
              error={errors['brand_assets']?.['header_logo']}
              keyPrefix="orgs/brand"
            />

            <ImagePicker
              label="Square Icon URL"
              name="square_icon_url"
              value={getBrandAssetUrl('square_icon')}
              onChange={(url) => handleBrandAssetChange('square_icon', url)}
              error={errors['brand_assets']?.['square_icon']}
              keyPrefix="orgs/brand"
            />

            <ImagePicker
              label="Splash Image URL"
              name="splash_image_url"
              value={getBrandAssetUrl('splash_image')}
              onChange={(url) => handleBrandAssetChange('splash_image', url)}
              error={errors['brand_assets']?.['splash_image']}
              keyPrefix="orgs/brand"
            />

            <ImagePicker
              label="Loading Mark URL"
              name="loading_mark_url"
              value={getBrandAssetUrl('loading_mark')}
              onChange={(url) => handleBrandAssetChange('loading_mark', url)}
              error={errors['brand_assets']?.['loading_mark']}
              keyPrefix="orgs/brand"
            />
          </div>
        </div>

        {/* Status Section (Edit Mode Only) */}
        {isEditMode && (
          <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
            <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">Status</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-20px">
              <div>
                <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium">
                  Plan Tier
                </label>
                <select
                  value={formData.plan_tier ?? 'basic'}
                  onChange={(e) => handleChange('plan_tier', e.target.value)}
                  className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark rounded font-medium"
                >
                  <option value="basic">Basic (subdomain only)</option>
                  <option value="pro">Pro (custom domain enabled)</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <p className="mt-6px text-xs text-contentColor dark:text-contentColor-dark opacity-70">
                  Pro plan unlocks custom domain support for this organization.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Domain Settings (Edit Mode Only) */}
        {isEditMode && organization?.id && (
          <OrgDomainPanel orgId={organization.id} />
        )}

        {/* Submit Button (Sticky Footer) */}
        <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark p-20px -mx-25px md:-mx-30px shadow-lg z-10">
          <div className="flex flex-col sm:flex-row gap-15px justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                loading ? 'cursor-wait' : ''
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-whiteColor"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                isEditMode ? 'Update Organization' : 'Create Organization'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

