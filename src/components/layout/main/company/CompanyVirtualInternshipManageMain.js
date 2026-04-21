"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import useSweetAlert from "@/hooks/useSweetAlert";
import {
  useTaskSubmissions,
  useVirtualInternship,
  useVirtualInternshipTasks,
} from "@/hooks/api/useVirtualInternships";

function StatusBadge({ status }) {
  const normalized = (status || "draft").toLowerCase();
  const isPublished = normalized === "published";
  const isDraft = normalized === "draft";
  const classes = isPublished
    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
    : isDraft
      ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300";

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
}

function TabButton({ isActive, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
        isActive
          ? "border-primaryColor dark:border-primaryColor-dark text-primaryColor dark:text-primaryColor-dark"
          : "border-transparent text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ModalShell({ isOpen, title, description, onClose, children, maxWidthClass = "max-w-2xl" }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        className={`w-full ${maxWidthClass} transform overflow-hidden rounded-2xl bg-whiteColor dark:bg-whiteColor-dark p-6 shadow-xl transition-all duration-300 animate-slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              {title}
            </h3>
            {description ? (
              <p id="modal-description" className="mt-1 text-sm text-contentColor dark:text-contentColor-dark">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-contentColor dark:text-contentColor-dark hover:bg-lightGrey10 dark:hover:bg-lightGrey10-dark transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function CreateTaskModal({ isOpen, onClose, onCreated, programId }) {
  const createAlert = useSweetAlert();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    dueDateLocal: "",
    maxMarks: 100,
    passingMarks: 50,
    allowLateSubmission: false,
    status: "draft",
    description: "",
    instructions: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      title: "",
      dueDateLocal: "",
      maxMarks: 100,
      passingMarks: 50,
      allowLateSubmission: false,
      status: "draft",
      description: "",
      instructions: "",
    });
  }, [isOpen]);

  const submit = async (e) => {
    e.preventDefault();
    if (!programId) return;
    if (!form.title.trim()) return;
    if (!form.dueDateLocal) return;

    setSubmitting(true);
    try {
      const dueDateIso = new Date(form.dueDateLocal).toISOString();
      const res = await fetch(`/api/virtual-internships/${programId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          dueDate: dueDateIso,
          maxMarks: Number(form.maxMarks) || 100,
          passingMarks: Number(form.passingMarks) || 50,
          allowLateSubmission: Boolean(form.allowLateSubmission),
          status: form.status || "draft",
          description: form.description?.trim() || null,
          instructions: form.instructions?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || "Failed to create task");
      }
      createAlert({ icon: "success", title: "Created", text: "Task created successfully." });
      onCreated?.();
      onClose?.();
    } catch (err) {
      createAlert({ icon: "error", title: "Error", text: err?.message || "Failed to create task" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title="Create Task"
      description="Add a new task to this program. Title and due date are required."
      onClose={submitting ? undefined : onClose}
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              placeholder="e.g. Build a landing page"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
              Due date <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={form.dueDateLocal}
              onChange={(e) => setForm((s) => ({ ...s, dueDateLocal: e.target.value }))}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
              Max marks
            </label>
            <input
              type="number"
              min={1}
              value={form.maxMarks}
              onChange={(e) => setForm((s) => ({ ...s, maxMarks: e.target.value }))}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
              Passing marks
            </label>
            <input
              type="number"
              min={0}
              value={form.passingMarks}
              onChange={(e) => setForm((s) => ({ ...s, passingMarks: e.target.value }))}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              disabled={submitting}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="allowLateSubmission"
            type="checkbox"
            checked={form.allowLateSubmission}
            onChange={(e) => setForm((s) => ({ ...s, allowLateSubmission: e.target.checked }))}
            disabled={submitting}
          />
          <label htmlFor="allowLateSubmission" className="text-sm text-blackColor dark:text-blackColor-dark">
            Allow late submission
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              placeholder="Short summary for students"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm((s) => ({ ...s, instructions: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              placeholder="Detailed instructions / acceptance criteria"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark px-4 py-2.5 text-sm font-medium text-contentColor dark:text-contentColor-dark hover:bg-lightGrey10 dark:hover:bg-lightGrey10-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center rounded-lg border border-transparent bg-primaryColor dark:bg-primaryColor-dark px-4 py-2.5 text-sm font-medium text-whiteColor dark:text-whiteColor-dark hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function GradeSubmissionModal({ isOpen, onClose, submission, maxMarks, onGraded }) {
  const createAlert = useSweetAlert();
  const [submitting, setSubmitting] = useState(false);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setMarks(submission?.marksObtained ?? submission?.marksObtained === 0 ? String(submission.marksObtained) : "");
    setFeedback(submission?.feedback || "");
  }, [isOpen, submission]);

  const submit = async (e) => {
    e.preventDefault();
    if (!submission?.id) return;
    const marksNum = marks === "" ? null : Number(marks);
    if (marksNum !== null) {
      if (Number.isNaN(marksNum)) return;
      if (marksNum < 0 || (typeof maxMarks === "number" && marksNum > maxMarks)) {
        createAlert({
          icon: "error",
          title: "Invalid marks",
          text: typeof maxMarks === "number" ? `Marks must be between 0 and ${maxMarks}.` : "Marks must be a non-negative number.",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/virtual-internships/submissions/${submission.id}/grade`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marksObtained: marksNum,
          feedback: feedback?.trim() || null,
          status: "graded",
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Failed to grade submission");
      createAlert({ icon: "success", title: "Saved", text: "Grade saved successfully." });
      onGraded?.();
      onClose?.();
    } catch (err) {
      createAlert({ icon: "error", title: "Error", text: err?.message || "Failed to grade submission" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title="Grade Submission"
      description="Add marks and feedback for this submission."
      onClose={submitting ? undefined : onClose}
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-borderColor dark:border-borderColor-dark p-4">
          <p className="text-sm text-contentColor dark:text-contentColor-dark">Student</p>
          <p className="font-semibold text-blackColor dark:text-blackColor-dark">
            {submission?.studentName || "Student"}
          </p>
          {submission?.studentEmail ? (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">{submission.studentEmail}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
              Marks {typeof maxMarks === "number" ? `(0–${maxMarks})` : ""}
            </label>
            <input
              type="number"
              min={0}
              max={typeof maxMarks === "number" ? maxMarks : undefined}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              placeholder="e.g. 85"
              disabled={submitting}
            />
          </div>
          <div className="flex items-center">
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              {submission?.isLate ? "Marked as late submission." : "On-time submission."}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">Feedback</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            placeholder="Add actionable feedback for the student"
            disabled={submitting}
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark px-4 py-2.5 text-sm font-medium text-contentColor dark:text-contentColor-dark hover:bg-lightGrey10 dark:hover:bg-lightGrey10-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center rounded-lg border border-transparent bg-primaryColor dark:bg-primaryColor-dark px-4 py-2.5 text-sm font-medium text-whiteColor dark:text-whiteColor-dark hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Grade"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const CompanyVirtualInternshipManageMain = ({ programId }) => {
  const router = useRouter();
  const createAlert = useSweetAlert();

  const { program, isLoading: isProgramLoading, mutate: mutateProgram } = useVirtualInternship(programId);
  const { tasks, isLoading: isTasksLoading, mutate: mutateTasks } = useVirtualInternshipTasks(programId);

  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [gradeTarget, setGradeTarget] = useState(null);

  const selectedTask = useMemo(
    () => tasks?.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const {
    submissions,
    isLoading: isSubmissionsLoading,
    mutate: mutateSubmissions,
  } = useTaskSubmissions(selectedTaskId || null);

  useEffect(() => {
    if (!selectedTaskId && tasks && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const handleTogglePublish = async () => {
    if (!programId || !program) return;
    const nextStatus = program.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/virtual-internships/${programId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Failed to update status");
      createAlert({
        icon: "success",
        title: "Updated",
        text: nextStatus === "published" ? "Program published." : "Program moved back to draft.",
      });
      mutateProgram();
    } catch (err) {
      createAlert({ icon: "error", title: "Error", text: err?.message || "Failed to update status" });
    }
  };

  const handleDeleteProgram = async () => {
    if (!programId) return;
    const result = await createAlert({
      icon: "warning",
      title: "Delete program?",
      text: "This will permanently delete the program and its tasks/submissions. This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!result?.isConfirmed) return;

    try {
      const res = await fetch(`/api/virtual-internships/${programId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Failed to delete program");
      createAlert({ icon: "success", title: "Deleted", text: "Program deleted successfully." });
      router.push("/dashboards/company-virtual-internships");
    } catch (err) {
      createAlert({ icon: "error", title: "Error", text: err?.message || "Failed to delete program" });
    }
  };

  const breadcrumbItems = useMemo(
    () => [
      { text: "Dashboard", href: "/dashboards/company-dashboard" },
      { text: "Virtual Internships", href: "/dashboards/company-virtual-internships" },
      { text: "Program", href: `/dashboards/company-virtual-internships/${programId}` },
    ],
    [programId]
  );

  if (isProgramLoading) {
    return (
      <>
        <HeadingDashboard text="Manage Program" breadcrumbItems={breadcrumbItems} />
        <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
          <div className="text-center py-8">
            <p className="text-contentColor dark:text-contentColor-dark">Loading program...</p>
          </div>
        </div>
      </>
    );
  }

  if (!program) {
    return (
      <>
        <HeadingDashboard text="Manage Program" breadcrumbItems={breadcrumbItems} />
        <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
          <div className="text-center py-8">
            <p className="text-contentColor dark:text-contentColor-dark">Program not found or access denied.</p>
            <button
              type="button"
              onClick={() => router.push("/dashboards/company-virtual-internships")}
              className="mt-4 px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90"
            >
              Back to Programs
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HeadingDashboard text="Manage Program" breadcrumbItems={breadcrumbItems} />

      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px mb-30px">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-blackColor dark:text-blackColor-dark truncate">
                {program.title}
              </h1>
              <StatusBadge status={program.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-contentColor dark:text-contentColor-dark">
              {program.industry ? <span>Industry: <span className="font-semibold">{program.industry}</span></span> : null}
              {program.durationWeeks ? <span>Duration: <span className="font-semibold">{program.durationWeeks} weeks</span></span> : null}
              <span>Last updated: <span className="font-semibold">{program.updatedAt ? new Date(program.updatedAt).toLocaleString() : "—"}</span></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleTogglePublish}
              className="px-4 py-2.5 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition"
            >
              {program.status === "published" ? "Unpublish" : "Publish"}
            </button>
            <button
              type="button"
              onClick={handleDeleteProgram}
              className="px-4 py-2.5 border border-red-500 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="px-30px pt-20px border-b border-borderColor dark:border-borderColor-dark flex gap-2 overflow-x-auto">
          <TabButton isActive={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
            Overview
          </TabButton>
          <TabButton isActive={activeTab === "tasks"} onClick={() => setActiveTab("tasks")}>
            Tasks
          </TabButton>
          <TabButton isActive={activeTab === "submissions"} onClick={() => setActiveTab("submissions")}>
            Submissions
          </TabButton>
        </div>

        <div className="p-30px">
          {/* Overview */}
          {activeTab === "overview" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                  <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Title</p>
                  <p className="font-semibold text-blackColor dark:text-blackColor-dark">{program.title}</p>
                </div>
                <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                  <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={program.status} />
                  </div>
                </div>
                <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                  <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Industry</p>
                  <p className="font-semibold text-blackColor dark:text-blackColor-dark">{program.industry || "—"}</p>
                </div>
                <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                  <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Duration (weeks)</p>
                  <p className="font-semibold text-blackColor dark:text-blackColor-dark">
                    {program.durationWeeks || "—"}
                  </p>
                </div>
              </div>

              <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-2">Description</p>
                {program.description ? (
                  <p className="text-blackColor dark:text-blackColor-dark whitespace-pre-wrap">{program.description}</p>
                ) : (
                  <p className="text-contentColor dark:text-contentColor-dark">No description provided.</p>
                )}
              </div>

              <div className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4">
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-2">Skills</p>
                {program.skillRequirements ? (
                  <pre className="text-xs overflow-auto bg-lightGrey10 dark:bg-lightGrey10-dark p-3 rounded">
                    {JSON.stringify(program.skillRequirements, null, 2)}
                  </pre>
                ) : (
                  <p className="text-contentColor dark:text-contentColor-dark">No skills specified.</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Tasks */}
          {activeTab === "tasks" ? (
            <div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">Tasks</h2>
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">
                    Create tasks students will complete as part of this program.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="px-4 py-2.5 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition"
                >
                  Create Task
                </button>
              </div>

              {isTasksLoading ? (
                <div className="text-center py-8">
                  <p className="text-contentColor dark:text-contentColor-dark">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-borderColor dark:border-borderColor-dark rounded-lg">
                  <p className="text-contentColor dark:text-contentColor-dark">
                    No tasks yet. Create your first task to get started.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-borderColor dark:border-borderColor-dark rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-lightGrey10 dark:bg-lightGrey10-dark">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Title</th>
                        <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Due</th>
                        <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Max marks</th>
                        <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t) => (
                        <tr key={t.id} className="border-t border-borderColor dark:border-borderColor-dark">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-blackColor dark:text-blackColor-dark">{t.title}</div>
                            {t.description ? (
                              <div className="text-xs text-contentColor dark:text-contentColor-dark line-clamp-1">
                                {t.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-contentColor dark:text-contentColor-dark">
                            {t.dueDate ? new Date(t.dueDate).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-contentColor dark:text-contentColor-dark">{t.maxMarks ?? "—"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={t.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <CreateTaskModal
                isOpen={isCreateTaskOpen}
                onClose={() => setIsCreateTaskOpen(false)}
                onCreated={() => mutateTasks()}
                programId={programId}
              />
            </div>
          ) : null}

          {/* Submissions */}
          {activeTab === "submissions" ? (
            <div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">Submissions</h2>
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">
                    Review student submissions per task and grade them.
                  </p>
                </div>
              </div>

              {isTasksLoading ? (
                <div className="text-center py-8">
                  <p className="text-contentColor dark:text-contentColor-dark">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-borderColor dark:border-borderColor-dark rounded-lg">
                  <p className="text-contentColor dark:text-contentColor-dark">
                    Create at least one task to receive submissions.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="min-w-[260px]">
                      <label className="block text-sm font-medium mb-1 text-blackColor dark:text-blackColor-dark">
                        Select task
                      </label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
                      >
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm text-contentColor dark:text-contentColor-dark">
                      {selectedTask?.dueDate ? (
                        <span>Due: <span className="font-semibold">{new Date(selectedTask.dueDate).toLocaleString()}</span></span>
                      ) : null}
                      {typeof selectedTask?.maxMarks === "number" ? (
                        <span className="ml-4">Max marks: <span className="font-semibold">{selectedTask.maxMarks}</span></span>
                      ) : null}
                    </div>
                    <div className="md:ml-auto">
                      <button
                        type="button"
                        onClick={() => mutateSubmissions()}
                        className="px-4 py-2.5 border border-borderColor dark:border-borderColor-dark rounded text-blackColor dark:text-blackColor-dark hover:bg-lightGrey10 dark:hover:bg-lightGrey10-dark transition"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {isSubmissionsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-contentColor dark:text-contentColor-dark">Loading submissions...</p>
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-borderColor dark:border-borderColor-dark rounded-lg">
                      <p className="text-contentColor dark:text-contentColor-dark">No submissions yet for this task.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-borderColor dark:border-borderColor-dark rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-lightGrey10 dark:bg-lightGrey10-dark">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Student</th>
                            <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Submitted</th>
                            <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Status</th>
                            <th className="text-left px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Marks</th>
                            <th className="text-right px-4 py-3 font-semibold text-blackColor dark:text-blackColor-dark">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((s) => (
                            <tr key={s.id} className="border-t border-borderColor dark:border-borderColor-dark">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-blackColor dark:text-blackColor-dark">
                                  {s.studentName || "Student"}
                                </div>
                                {s.studentEmail ? (
                                  <div className="text-xs text-contentColor dark:text-contentColor-dark">{s.studentEmail}</div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-contentColor dark:text-contentColor-dark">
                                {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"}
                                {s.isLate ? <span className="ml-2 text-xs text-red-600">Late</span> : null}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={s.status} />
                              </td>
                              <td className="px-4 py-3 text-contentColor dark:text-contentColor-dark">
                                {s.marksObtained ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setGradeTarget(s)}
                                  className="px-3 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 transition text-xs"
                                >
                                  {s.status === "graded" ? "Edit grade" : "Grade"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <GradeSubmissionModal
                    isOpen={Boolean(gradeTarget)}
                    onClose={() => setGradeTarget(null)}
                    submission={gradeTarget}
                    maxMarks={typeof selectedTask?.maxMarks === "number" ? selectedTask.maxMarks : undefined}
                    onGraded={() => mutateSubmissions()}
                  />
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default CompanyVirtualInternshipManageMain;

