"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useVendorAssignment,
  useCreateVendorAssignment,
  useUpdateVendorAssignment,
  useVendorCourses,
} from "@/hooks/api/useVendorAssignments";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import FieldError from "@/components/shared/errors/FieldError";
import useSweetAlert from "@/hooks/useSweetAlert";

const VendorAddAssignmentMain = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAlert = useSweetAlert();

  const assignmentId = searchParams.get("id");
  const isEditMode = !!assignmentId;

  const { data: assignmentData, isLoading: isLoadingAssignment } = useVendorAssignment(
    assignmentId,
    { enabled: isEditMode }
  );

  const { data: coursesData, isLoading: isLoadingCourses } = useVendorCourses();
  const courses = coursesData?.courses || [];

  const createMutation = useCreateVendorAssignment();
  const updateMutation = useUpdateVendorAssignment();

  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    instructions: "",
    maxMarks: 100,
    passingMarks: 50,
    dueDate: "",
    allowLateSubmission: false,
    lateSubmissionPenalty: 0,
    maxFileSizeMb: 10,
    allowedFileTypes: [],
    status: "draft",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when assignment data is loaded
  useEffect(() => {
    if (assignmentData?.assignment && isEditMode) {
      const assignment = assignmentData.assignment;
      const dueDate = assignment.dueDate
        ? new Date(assignment.dueDate).toISOString().slice(0, 16)
        : "";

      setFormData({
        courseId: assignment.courseId || "",
        title: assignment.title || "",
        description: assignment.description || "",
        instructions: assignment.instructions || "",
        maxMarks: assignment.maxMarks || 100,
        passingMarks: assignment.passingMarks || 50,
        dueDate: dueDate,
        allowLateSubmission: assignment.allowLateSubmission || false,
        lateSubmissionPenalty: assignment.lateSubmissionPenalty || 0,
        maxFileSizeMb: assignment.maxFileSizeMb || 10,
        allowedFileTypes: assignment.allowedFileTypes || [],
        status: assignment.status || "draft",
      });
    }
  }, [assignmentData, isEditMode]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.courseId) {
      newErrors.courseId = "Course is required";
    }

    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    }

    if (formData.maxMarks <= 0) {
      newErrors.maxMarks = "Max marks must be greater than 0";
    }

    if (formData.passingMarks < 0) {
      newErrors.passingMarks = "Passing marks must be greater than or equal to 0";
    }

    if (formData.passingMarks > formData.maxMarks) {
      newErrors.passingMarks = "Passing marks cannot be greater than max marks";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e, status = "draft") => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dueDateISO = formData.dueDate
        ? new Date(formData.dueDate).toISOString()
        : null;

      const submitData = {
        ...formData,
        dueDate: dueDateISO,
        status,
      };

      if (isEditMode) {
        await updateMutation.mutateAsync({
          assignmentId,
          data: submitData,
        });
        router.push("/dashboards/vendor-manage-assignments");
      } else {
        await createMutation.mutateAsync(submitData);
        router.push("/dashboards/vendor-manage-assignments");
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} assignment:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const courseOptions = courses.map((course) => ({
    id: course.id,
    label: course.title,
    value: course.id,
  }));

  const fileTypeOptions = [
    { id: "pdf", label: "PDF", value: "pdf" },
    { id: "doc", label: "DOC", value: "doc" },
    { id: "docx", label: "DOCX", value: "docx" },
    { id: "jpg", label: "JPG", value: "jpg" },
    { id: "jpeg", label: "JPEG", value: "jpeg" },
    { id: "png", label: "PNG", value: "png" },
    { id: "zip", label: "ZIP", value: "zip" },
  ];

  if (isEditMode && isLoadingAssignment) {
    return (
      <div>
        <HeadingDashboard>Edit Assignment</HeadingDashboard>
        <div className="text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark">Loading assignment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeadingDashboard>
        {isEditMode ? "Edit Assignment" : "Add Assignment"}
      </HeadingDashboard>

      {courses.length === 0 && !isLoadingCourses && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-5 p-20px mt-30px">
          <p className="text-yellow-700 dark:text-yellow-400">
            No published courses found. Please create and publish a course first.
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => handleSubmit(e, formData.status)}
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mt-30px space-y-20px"
      >
        {/* Course Selection */}
        <div>
          <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
            Course <span className="text-red-500">*</span>
          </label>
          <AdvancedDropdown
            options={courseOptions}
            value={formData.courseId}
            onChange={(value) => handleChange("courseId", value)}
            placeholder="Select a course..."
            searchable={true}
            loading={isLoadingCourses}
            disabled={isLoadingCourses || isSubmitting || isEditMode}
          />
          {isEditMode && (
            <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              Course cannot be changed after assignment is created.
            </p>
          )}
          {errors.courseId && <FieldError>{errors.courseId}</FieldError>}
        </div>

        {/* Title */}
        <div>
          <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
            placeholder="Enter assignment title"
            disabled={isSubmitting}
          />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </div>

        {/* Description */}
        <div>
          <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={4}
            className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
            placeholder="Enter assignment description"
            disabled={isSubmitting}
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
            Instructions
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => handleChange("instructions", e.target.value)}
            rows={4}
            className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
            placeholder="Enter assignment instructions for students"
            disabled={isSubmitting}
          />
        </div>

        {/* Marks Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Max Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.maxMarks}
              onChange={(e) => handleChange("maxMarks", parseFloat(e.target.value) || 0)}
              min="1"
              step="0.01"
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
            {errors.maxMarks && <FieldError>{errors.maxMarks}</FieldError>}
          </div>
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Passing Marks
            </label>
            <input
              type="number"
              value={formData.passingMarks}
              onChange={(e) => handleChange("passingMarks", parseFloat(e.target.value) || 0)}
              min="0"
              max={formData.maxMarks}
              step="0.01"
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
            {errors.passingMarks && <FieldError>{errors.passingMarks}</FieldError>}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) => handleChange("dueDate", e.target.value)}
            className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
            disabled={isSubmitting}
          />
          {errors.dueDate && <FieldError>{errors.dueDate}</FieldError>}
        </div>

        {/* Late Submission Settings */}
        <div className="space-y-15px">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowLateSubmission"
              checked={formData.allowLateSubmission}
              onChange={(e) => handleChange("allowLateSubmission", e.target.checked)}
              className="w-4 h-4 text-primaryColor bg-lightGrey5 dark:bg-darkdeep1 border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
              disabled={isSubmitting}
            />
            <label
              htmlFor="allowLateSubmission"
              className="ml-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark"
            >
              Allow Late Submission
            </label>
          </div>

          {formData.allowLateSubmission && (
            <div>
              <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                Late Submission Penalty (%)
              </label>
              <input
                type="number"
                value={formData.lateSubmissionPenalty}
                onChange={(e) => handleChange("lateSubmissionPenalty", parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.01"
                className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
                disabled={isSubmitting}
              />
              <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
                Percentage of marks to deduct for late submissions (0-100)
              </p>
            </div>
          )}
        </div>

        {/* File Upload Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Max File Size (MB)
            </label>
            <input
              type="number"
              value={formData.maxFileSizeMb}
              onChange={(e) => handleChange("maxFileSizeMb", parseInt(e.target.value) || 10)}
              min="1"
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Allowed File Types
            </label>
            <AdvancedDropdown
              options={fileTypeOptions}
              value={formData.allowedFileTypes}
              onChange={(value) => handleChange("allowedFileTypes", value)}
              placeholder="Select file types..."
              multiple={true}
              searchable={true}
              disabled={isSubmitting}
            />
            <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              Restrict file types that students can upload. Leave empty to allow all file types.
            </p>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
            disabled={isSubmitting}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-15px pt-20px">
          <button
            type="submit"
            disabled={isSubmitting || courses.length === 0}
            className="flex-1 px-20px py-12px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
              ? "Update Assignment"
              : "Create Assignment"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboards/vendor-manage-assignments")}
            className="px-20px py-12px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorAddAssignmentMain;
