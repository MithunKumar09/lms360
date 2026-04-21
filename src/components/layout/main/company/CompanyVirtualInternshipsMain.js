"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { useVirtualInternships } from "@/hooks/api/useVirtualInternships";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import useSweetAlert from "@/hooks/useSweetAlert";

const CompanyVirtualInternshipsMain = () => {
  const createAlert = useSweetAlert();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { programs, isLoading, mutate } = useVirtualInternships({ status: null });

  const handleCreateProgram = async (programData) => {
    try {
      const response = await fetch('/api/virtual-internships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programData),
      });

      const result = await response.json();

      if (result.success) {
        createAlert({
          title: "Success",
          text: "Virtual internship program created successfully",
          icon: "success",
        });
        mutate();
        setShowCreateForm(false);
      } else {
        createAlert({
          title: "Error",
          text: result.error || "Failed to create program",
          icon: "error",
        });
      }
    } catch (error) {
      createAlert({
        title: "Error",
        text: error.message || "Failed to create program",
        icon: "error",
      });
    }
  };

  return (
    <>
      <HeadingDashboard
        text="Virtual Internship Programs"
        breadcrumbItems={[
          { text: "Dashboard", href: "/dashboards/company-dashboard" },
          { text: "Virtual Internships", href: "/dashboards/company-virtual-internships" },
        ]}
      />

      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px mb-30px">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            My Virtual Internship Programs
          </h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition"
          >
            {showCreateForm ? "Cancel" : "Create New Program"}
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-6 p-4 border border-borderColor dark:border-borderColor-dark rounded">
            <h3 className="text-lg font-semibold mb-4">Create Virtual Internship Program</h3>
            <VirtualInternshipProgramForm onSubmit={handleCreateProgram} onCancel={() => setShowCreateForm(false)} />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-contentColor dark:text-contentColor-dark">Loading programs...</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-contentColor dark:text-contentColor-dark">No virtual internship programs yet. Create your first program to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} onUpdate={mutate} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

function VirtualInternshipProgramForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    industry: "",
    durationWeeks: "",
    status: "draft",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        durationWeeks: formData.durationWeeks ? parseInt(formData.durationWeeks) : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          placeholder="Program Title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
          placeholder="Program Description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">Industry</label>
          <input
            type="text"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            placeholder="Industry"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">Duration (Weeks)</label>
          <input
            type="number"
            value={formData.durationWeeks}
            onChange={(e) => setFormData({ ...formData, durationWeeks: e.target.value })}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            placeholder="Duration"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Program"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded text-blackColor dark:text-blackColor-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ProgramCard({ program, onUpdate }) {
  const router = useRouter();
  
  return (
    <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold mb-2 text-blackColor dark:text-blackColor-dark">{program.title}</h3>
      {program.description && (
        <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">{program.description}</p>
      )}
      <div className="flex justify-between items-center text-sm text-contentColor dark:text-contentColor-dark mb-3">
        <span>Status: <span className="font-semibold">{program.status}</span></span>
        {program.industry && <span>{program.industry}</span>}
      </div>
      <button
        onClick={() => router.push(`/dashboards/company-virtual-internships/${program.id}`)}
        className="w-full px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition text-sm"
      >
        Manage Program
      </button>
    </div>
  );
}

export default CompanyVirtualInternshipsMain;
