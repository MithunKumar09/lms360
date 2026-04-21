"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useVendorQuiz,
  useCreateVendorQuiz,
  useUpdateVendorQuiz,
  useVendorCoursesForQuiz,
} from "@/hooks/api/useVendorQuizzes";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import FieldError from "@/components/shared/errors/FieldError";
import useSweetAlert from "@/hooks/useSweetAlert";

const VendorAddQuizMain = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAlert = useSweetAlert();

  const quizId = searchParams.get("id");
  const isEditMode = !!quizId;

  const { data: quizData, isLoading: isLoadingQuiz } = useVendorQuiz(quizId, {
    enabled: isEditMode,
  });

  const { data: coursesData, isLoading: isLoadingCourses } = useVendorCoursesForQuiz();
  const courses = coursesData?.courses || [];

  const createMutation = useCreateVendorQuiz();
  const updateMutation = useUpdateVendorQuiz();

  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    description: "",
    instructions: "",
    totalMarks: 100,
    passingMarks: 50,
    timeLimitMinutes: null,
    maxAttempts: 1,
    showResultsImmediately: false,
    showCorrectAnswers: false,
    randomizeQuestions: false,
    randomizeOptions: false,
    status: "draft",
    startDate: "",
    endDate: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when quiz data is loaded
  useEffect(() => {
    if (quizData?.quiz && isEditMode) {
      const quiz = quizData.quiz;
      const startDate = quiz.startDate
        ? new Date(quiz.startDate).toISOString().slice(0, 16)
        : "";
      const endDate = quiz.endDate
        ? new Date(quiz.endDate).toISOString().slice(0, 16)
        : "";

      setFormData({
        courseId: quiz.courseId || "",
        title: quiz.title || "",
        description: quiz.description || "",
        instructions: quiz.instructions || "",
        totalMarks: quiz.totalMarks || 100,
        passingMarks: quiz.passingMarks || 50,
        timeLimitMinutes: quiz.timeLimitMinutes || null,
        maxAttempts: quiz.maxAttempts || 1,
        showResultsImmediately: quiz.showResultsImmediately || false,
        showCorrectAnswers: quiz.showCorrectAnswers || false,
        randomizeQuestions: quiz.randomizeQuestions || false,
        randomizeOptions: quiz.randomizeOptions || false,
        status: quiz.status || "draft",
        startDate: startDate,
        endDate: endDate,
      });
    }
  }, [quizData, isEditMode]);

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

    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    if (formData.totalMarks <= 0) {
      newErrors.totalMarks = "Total marks must be greater than 0";
    }

    if (formData.passingMarks < 0) {
      newErrors.passingMarks = "Passing marks must be greater than or equal to 0";
    }

    if (formData.passingMarks > formData.totalMarks) {
      newErrors.passingMarks = "Passing marks cannot be greater than total marks";
    }

    if (formData.timeLimitMinutes !== null && formData.timeLimitMinutes <= 0) {
      newErrors.timeLimitMinutes = "Time limit must be greater than 0";
    }

    if (formData.maxAttempts < 1) {
      newErrors.maxAttempts = "Max attempts must be at least 1";
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
      const startDateISO = formData.startDate
        ? new Date(formData.startDate).toISOString()
        : null;
      const endDateISO = formData.endDate
        ? new Date(formData.endDate).toISOString()
        : null;

      const submitData = {
        ...formData,
        courseId: formData.courseId || null,
        timeLimitMinutes: formData.timeLimitMinutes || null,
        startDate: startDateISO,
        endDate: endDateISO,
        status,
      };

      if (isEditMode) {
        await updateMutation.mutateAsync({
          quizId,
          data: submitData,
        });
        router.push("/dashboards/vendor-manage-quiz");
      } else {
        await createMutation.mutateAsync(submitData);
        router.push("/dashboards/vendor-manage-quiz");
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} quiz:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const courseOptions = [
    { id: "none", label: "Standalone Quiz (No Course)", value: "" },
    ...courses.map((course) => ({
      id: course.id,
      label: course.title,
      value: course.id,
    })),
  ];

  if (isEditMode && isLoadingQuiz) {
    return (
      <div>
        <HeadingDashboard>Edit Quiz</HeadingDashboard>
        <div className="text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark">Loading quiz data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeadingDashboard>
        {isEditMode ? "Edit Quiz" : "Add Quiz"}
      </HeadingDashboard>

      <form
        onSubmit={(e) => handleSubmit(e, formData.status)}
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mt-30px space-y-20px"
      >
        {/* Course Selection (Optional) */}
        <div>
          <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
            Course (Optional)
          </label>
          <AdvancedDropdown
            options={courseOptions}
            value={formData.courseId}
            onChange={(value) => handleChange("courseId", value)}
            placeholder="Select a course or leave empty for standalone quiz..."
            searchable={true}
            loading={isLoadingCourses}
            disabled={isLoadingCourses || isSubmitting || isEditMode}
          />
          {isEditMode && (
            <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              Course cannot be changed after quiz is created.
            </p>
          )}
          <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
            Link this quiz to a course, or leave empty to create a standalone quiz.
          </p>
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
            placeholder="Enter quiz title"
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
            placeholder="Enter quiz description"
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
            placeholder="Enter quiz instructions for students"
            disabled={isSubmitting}
          />
        </div>

        {/* Marks Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Total Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.totalMarks}
              onChange={(e) => handleChange("totalMarks", parseFloat(e.target.value) || 0)}
              min="1"
              step="0.01"
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
            {errors.totalMarks && <FieldError>{errors.totalMarks}</FieldError>}
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
              max={formData.totalMarks}
              step="0.01"
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
            {errors.passingMarks && <FieldError>{errors.passingMarks}</FieldError>}
          </div>
        </div>

        {/* Time Limit and Max Attempts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Time Limit (Minutes)
            </label>
            <input
              type="number"
              value={formData.timeLimitMinutes || ""}
              onChange={(e) =>
                handleChange("timeLimitMinutes", e.target.value ? parseInt(e.target.value) : null)
              }
              min="1"
              placeholder="No time limit"
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
            {errors.timeLimitMinutes && <FieldError>{errors.timeLimitMinutes}</FieldError>}
            <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              Leave empty for no time limit
            </p>
          </div>
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Max Attempts
            </label>
            <input
              type="number"
              value={formData.maxAttempts}
              onChange={(e) => handleChange("maxAttempts", parseInt(e.target.value) || 1)}
              min="1"
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
            {errors.maxAttempts && <FieldError>{errors.maxAttempts}</FieldError>}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15px">
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              Start Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block mb-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              className="w-full py-12px px-15px text-14px focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-5"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Quiz Settings */}
        <div className="space-y-15px">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showResultsImmediately"
              checked={formData.showResultsImmediately}
              onChange={(e) => handleChange("showResultsImmediately", e.target.checked)}
              className="w-4 h-4 text-primaryColor bg-lightGrey5 dark:bg-darkdeep1 border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
              disabled={isSubmitting}
            />
            <label
              htmlFor="showResultsImmediately"
              className="ml-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark"
            >
              Show Results Immediately
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showCorrectAnswers"
              checked={formData.showCorrectAnswers}
              onChange={(e) => handleChange("showCorrectAnswers", e.target.checked)}
              className="w-4 h-4 text-primaryColor bg-lightGrey5 dark:bg-darkdeep1 border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
              disabled={isSubmitting}
            />
            <label
              htmlFor="showCorrectAnswers"
              className="ml-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark"
            >
              Show Correct Answers
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="randomizeQuestions"
              checked={formData.randomizeQuestions}
              onChange={(e) => handleChange("randomizeQuestions", e.target.checked)}
              className="w-4 h-4 text-primaryColor bg-lightGrey5 dark:bg-darkdeep1 border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
              disabled={isSubmitting}
            />
            <label
              htmlFor="randomizeQuestions"
              className="ml-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark"
            >
              Randomize Questions
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="randomizeOptions"
              checked={formData.randomizeOptions}
              onChange={(e) => handleChange("randomizeOptions", e.target.checked)}
              className="w-4 h-4 text-primaryColor bg-lightGrey5 dark:bg-darkdeep1 border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
              disabled={isSubmitting}
            />
            <label
              htmlFor="randomizeOptions"
              className="ml-10px text-14px font-semibold text-blackColor dark:text-blackColor-dark"
            >
              Randomize Options
            </label>
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

        {/* Note about auto-grading */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-5 p-15px">
          <p className="text-14px text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> All quizzes are automatically graded. Only auto-gradable question types (MCQ, True/False, Fill in the blanks, Numeric, Short answer) are available. Essay/written questions are not supported.
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-15px pt-20px">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-20px py-12px bg-primaryColor text-whiteColor rounded-5 text-14px font-semibold hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
              ? "Update Quiz"
              : "Create Quiz"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboards/vendor-manage-quiz")}
            className="px-20px py-12px bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark rounded-5 text-14px font-semibold hover:bg-lightGrey6 dark:hover:bg-darkdeep2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorAddQuizMain;
