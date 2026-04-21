"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";

export default function MentorAddJobMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    job_type: "full_time",
    salary_min: "",
    salary_max: "",
    salary_currency: "INR",
    skills: [],
    description: "",
    full_description: "",
    application_deadline: "",
    external_apply_link: "",
    status: "draft",
  });
  const [skillInput, setSkillInput] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (index) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = "Title is required and must be at least 3 characters";
    }

    if (!formData.company || formData.company.trim().length < 1) {
      newErrors.company = "Company is required";
    }

    if (formData.salary_min && parseFloat(formData.salary_min) < 0) {
      newErrors.salary_min = "Salary min must be >= 0";
    }

    if (formData.salary_max && parseFloat(formData.salary_max) < 0) {
      newErrors.salary_max = "Salary max must be >= 0";
    }

    if (formData.salary_min && formData.salary_max) {
      if (parseFloat(formData.salary_max) < parseFloat(formData.salary_min)) {
        newErrors.salary_max = "Salary max must be >= salary min";
      }
    }

    if (formData.external_apply_link && !formData.external_apply_link.match(/^https?:\/\//)) {
      newErrors.external_apply_link = "External apply link must be a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createJobMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/jobs", data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create job");
      }
      return response;
    },
    onSuccess: () => {
      createAlert("success", "Job created successfully!");
      router.push("/dashboards/mentor-manage-jobs");
    },
    onError: (error) => {
      console.error("Create job error:", error);
      createAlert("error", error.message || "Failed to create job");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      createAlert("error", "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location?.trim() || null,
      job_type: formData.job_type,
      salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
      salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
      salary_currency: formData.salary_currency,
      skills: formData.skills.length > 0 ? formData.skills : null,
      description: formData.description?.trim() || null,
      full_description: formData.full_description?.trim() || null,
      application_deadline: formData.application_deadline || null,
      external_apply_link: formData.external_apply_link?.trim() || null,
      status: formData.status,
    };

    try {
      await createJobMutation.mutateAsync(payload);
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSalary = (min, max, currency = "INR") => {
    if (!min && !max) return "Not specified";
    const formattedMin = min ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(min) : "";
    const formattedMax = max ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(max) : "";
    if (min && max) return `${formattedMin} - ${formattedMax}`;
    if (min) return `${formattedMin}+`;
    if (max) return `Up to ${formattedMax}`;
    return "Not specified";
  };

  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Add Job</h1>
              <p className="text-muted mb-0 small">
                Create a new job posting
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g., Software Engineer"
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.title ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Company name"
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.company ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Remote, Mumbai, India"
                className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Job Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.job_type}
                onChange={(e) => handleChange("job_type", e.target.value)}
                className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Salary Min (INR)
              </label>
              <input
                type="number"
                value={formData.salary_min}
                onChange={(e) => handleChange("salary_min", e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.salary_min ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.salary_min && <p className="text-red-500 text-xs mt-1">{errors.salary_min}</p>}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Salary Max (INR)
              </label>
              <input
                type="number"
                value={formData.salary_max}
                onChange={(e) => handleChange("salary_max", e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.salary_max ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.salary_max && <p className="text-red-500 text-xs mt-1">{errors.salary_max}</p>}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Currency
              </label>
              <select
                value={formData.salary_currency}
                onChange={(e) => handleChange("salary_currency", e.target.value)}
                className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {formData.salary_min || formData.salary_max ? (
            <div className="mb-4">
              <p className="text-sm text-contentColor dark:text-contentColor-dark">
                <strong>Salary Range:</strong> {formatSalary(
                  formData.salary_min ? parseFloat(formData.salary_min) : null,
                  formData.salary_max ? parseFloat(formData.salary_max) : null,
                  formData.salary_currency
                )}
              </p>
            </div>
          ) : null}

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Skills
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add a skill and press Enter"
                className="flex-1 py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primaryColor/10 text-primaryColor rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="text-primaryColor hover:text-primaryColor/70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Description (Short)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Brief job description"
              rows={3}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Full Description
            </label>
            <textarea
              value={formData.full_description}
              onChange={(e) => handleChange("full_description", e.target.value)}
              placeholder="Detailed job description, requirements, responsibilities..."
              rows={8}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Application Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.application_deadline}
                onChange={(e) => handleChange("application_deadline", e.target.value)}
                className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                External Apply Link
              </label>
              <input
                type="url"
                value={formData.external_apply_link}
                onChange={(e) => handleChange("external_apply_link", e.target.value)}
                placeholder="https://company.com/careers/apply"
                className={`w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                  errors.external_apply_link ? "border-red-500 dark:border-red-500" : "border-borderColor dark:border-borderColor-dark"
                } rounded-md`}
              />
              {errors.external_apply_link && <p className="text-red-500 text-xs mt-1">{errors.external_apply_link}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-darkdeep3 dark:hover:bg-darkdeep3-dark transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}

