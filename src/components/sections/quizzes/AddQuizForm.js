"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useCoursesForDropdownWithPagination from "@/hooks/api/useCoursesForDropdownWithPagination.js";
import useInstructorsForDropdown from "@/hooks/api/useInstructorsForDropdown.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import FieldError from "@/components/shared/errors/FieldError.js";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown.js";
import { useAuthStore } from "@/store/index.js";
import MiniCourseForm from "@/components/sections/quizzes/MiniCourseForm.js";
import CohortFilter from "@/components/sections/quizzes/CohortFilter.js";
import SortableContainer, { SortableItem } from "@/components/shared/course-builder/SortableContainer.js";

// Helper functions for date conversion (outside component to avoid recreation)
const isoToDateTimeLocal = (isoString) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    // Check if date is valid
    if (isNaN(date.getTime())) return "";
    // Convert to local datetime-local format (YYYY-MM-DDTHH:mm)
    // Use local time, not UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error converting ISO to datetime-local:', error);
    return "";
  }
};

const dateTimeLocalToIso = (dateTimeLocal) => {
  if (!dateTimeLocal) return null;
  try {
    // datetime-local format is "YYYY-MM-DDTHH:mm" (local time)
    // Create a date object from the local datetime string
    // The Date constructor interprets this as local time
    const date = new Date(dateTimeLocal);
    if (isNaN(date.getTime())) return null;
    // Convert to ISO string (UTC)
    return date.toISOString();
  } catch (error) {
    console.error('Error converting datetime-local to ISO:', error);
    return null;
  }
};

const AddQuizForm = ({ role = "instructor", quizId = null }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);
  const isEditMode = !!quizId;

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Form state
  const [formData, setFormData] = useState({
    quizType: "main_course", // 'main_course', 'mini_course', 'global'
    courseId: null, // Optional for all roles
    orgId: null, // Only for superadmin
    instructorId: null, // For admin and superadmin
    miniCourseId: null, // For mini_course quiz type
    cohortIds: [], // Array of cohort IDs for admin cohort-based quizzes
    adminId: null, // For admin-created global quizzes
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
    startDate: null,
    endDate: null,
  });

  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredCoursesFromCohort, setFilteredCoursesFromCohort] = useState([]);
  
  // Pagination state for courses dropdown
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesSearch, setCoursesSearch] = useState('');
  
  // Memoized date values for datetime-local inputs to prevent lag
  const startDateLocal = useMemo(() => {
    return formData.startDate ? isoToDateTimeLocal(formData.startDate) : "";
  }, [formData.startDate]);
  
  const endDateLocal = useMemo(() => {
    return formData.endDate ? isoToDateTimeLocal(formData.endDate) : "";
  }, [formData.endDate]);

  // Fetch quiz data if in edit mode
  const { data: quizData, isLoading: isLoadingQuizData } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!quizId) return null;
      const response = await apiClient.get(`/quizzes/${quizId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quiz');
      }
      return response.quiz;
    },
    enabled: isEditMode && !!quizId,
    staleTime: 5 * 60 * 1000,
  });

  // Populate form when quiz data is loaded
  useEffect(() => {
    if (quizData && isEditMode) {
      // Store dates as ISO strings (full ISO format, not sliced)
      const startDate = quizData.startDate 
        ? new Date(quizData.startDate).toISOString()
        : null;
      const endDate = quizData.endDate 
        ? new Date(quizData.endDate).toISOString()
        : null;

      setFormData({
        quizType: quizData.quizType || "main_course",
        courseId: quizData.courseId || null,
        orgId: quizData.orgId || null,
        instructorId: quizData.createdBy || null, // Set instructor from createdBy
        miniCourseId: quizData.miniCourseId || null,
        cohortIds: quizData.cohortIds || [],
        adminId: quizData.adminId || null,
        title: quizData.title || "",
        description: quizData.description || "",
        instructions: quizData.instructions || "",
        totalMarks: quizData.totalMarks || 100,
        passingMarks: quizData.passingMarks || 50,
        timeLimitMinutes: quizData.timeLimitMinutes || null,
        maxAttempts: quizData.maxAttempts || 1,
        showResultsImmediately: quizData.showResultsImmediately || false,
        showCorrectAnswers: quizData.showCorrectAnswers || false,
        randomizeQuestions: quizData.randomizeQuestions || false,
        randomizeOptions: quizData.randomizeOptions || false,
        status: quizData.status || "draft",
        startDate: startDate,
        endDate: endDate,
      });

      // Transform questions from API format to form format
      if (quizData.questions && quizData.questions.length > 0) {
        const transformedQuestions = quizData.questions.map((q, index) => ({
          id: q.id || `question-${index}`,
          questionText: q.questionText || "",
          questionType: q.questionType || "multiple_choice",
          marks: q.marks || 1,
          options: q.options && q.options.length > 0
            ? q.options.map((opt, optIndex) => ({
                id: opt.id || `option-${index}-${optIndex}`,
                optionText: opt.optionText || "",
                isCorrect: opt.isCorrect || false,
              }))
            : [
                { id: "1", optionText: "", isCorrect: false },
                { id: "2", optionText: "", isCorrect: false },
              ],
        }));
        setQuestions(transformedQuestions);
      }
    }
  }, [quizData, isEditMode]);

  // Fetch organizations for superadmin
  const { data: orgsData } = useQuery({
    queryKey: ["organizations", "list"],
    queryFn: async () => {
      const response = await apiClient.get("/organizations");
      return response.organizations || [];
    },
    enabled: role === "superadmin",
    staleTime: 5 * 60 * 1000,
  });
  const organizations = orgsData || [];

  // Fetch instructors for admin and superadmin
  const { data: instructorsData, isLoading: isLoadingInstructors } = useInstructorsForDropdown({
    orgId: role === "superadmin" ? formData.orgId : undefined, // Filter by org for superadmin
    enabled: (role === "admin" || role === "superadmin") && !isEditMode, // Only fetch in create mode
  });
  const instructors = instructorsData?.instructors || [];

  // Fetch courses with pagination (filtered by instructor if selected for admin/superadmin)
  const { data: coursesData, isLoading: isLoadingCourses } = useCoursesForDropdownWithPagination({
    instructorId: (role === "admin" || role === "superadmin") && formData.instructorId ? formData.instructorId : null,
    organizationId: role === "superadmin" ? formData.orgId : null,
    page: coursesPage,
    limit: 20,
    search: coursesSearch,
    enabled: !isEditMode && formData.quizType === "main_course", // Only fetch in create mode and for main_course
  });
  
  const courses = coursesData?.courses || [];
  const coursesPagination = coursesData?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };
  
  // Reset courses page when instructor changes
  useEffect(() => {
    if ((role === "admin" || role === "superadmin") && !isEditMode) {
      setCoursesPage(1);
      setCoursesSearch('');
    }
  }, [formData.instructorId, role, isEditMode]);

  // Transform options for dropdowns
  const orgOptions = [
    { id: "global", label: "Global (No Organization)", value: null },
    ...organizations.map((org) => ({
      id: org.id,
      label: org.name,
      value: org.id,
    })),
  ];

  const instructorOptions = [
    { id: "none", label: "Select Instructor", value: null },
    ...instructors.map((instructor) => ({
      id: instructor.id,
      label: instructor.label,
      value: instructor.id,
    })),
  ];

  const courseOptions = [
    { id: "none", label: "No Course (Standalone Quiz)", value: null },
    ...courses.map((course) => ({
      id: course.id,
      label: course.title,
      value: course.id,
    })),
  ];

  // Question types
  const questionTypes = [
    { id: "multiple_choice", label: "Multiple Choice", value: "multiple_choice" },
    { id: "true_false", label: "True/False", value: "true_false" },
    { id: "short_answer", label: "Short Answer", value: "short_answer" },
    { id: "essay", label: "Essay", value: "essay" },
  ];

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };
      // If instructor changes, clear course selection (courses are filtered by instructor)
      if (field === "instructorId" && (role === "admin" || role === "superadmin")) {
        updated.courseId = null;
      }
      // If organization changes (superadmin), clear instructor and course
      if (field === "orgId" && role === "superadmin") {
        updated.instructorId = null;
        updated.courseId = null;
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Question management
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      questionText: "",
      questionType: "multiple_choice",
      marks: 1,
      options: [
        { id: "1", optionText: "", isCorrect: false },
        { id: "2", optionText: "", isCorrect: false },
      ],
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId, field, value) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
    );
  };

  const deleteQuestion = (questionId) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const addOption = (questionId) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: [
              ...q.options,
              { id: Date.now().toString(), optionText: "", isCorrect: false },
            ],
          };
        }
        return q;
      })
    );
  };

  const updateOption = (questionId, optionId, field, value) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map((opt) =>
              opt.id === optionId ? { ...opt, [field]: value } : opt
            ),
          };
        }
        return q;
      })
    );
  };

  const deleteOption = (questionId, optionId) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const newOptions = q.options.filter((opt) => opt.id !== optionId);
          // Ensure at least 2 options for MC/True-False
          if (["multiple_choice", "true_false"].includes(q.questionType) && newOptions.length < 2) {
            return q; // Don't delete if it would leave less than 2 options
          }
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };

  // Reorder questions using drag-and-drop
  const reorderQuestions = (newOrder) => {
    setQuestions(newOrder);
  };

  // Legacy reorder function (for backward compatibility)
  const reorderQuestion = (questionId, direction) => {
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === questionId);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newQuestions = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [newQuestions[index], newQuestions[targetIndex]] = [
        newQuestions[targetIndex],
        newQuestions[index],
      ];
      return newQuestions;
    });
  };

  // Step validation
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      // Step 1: Quiz Type Selection
      if (!formData.quizType) {
        newErrors.quizType = "Please select a quiz type";
      }
    } else if (step === 2) {
      // Step 2: Assignment
      if (formData.quizType === "main_course") {
        // For main_course, courseId is optional but miniCourseId must be null
        if (formData.miniCourseId) {
          newErrors.miniCourseId = "Mini course cannot be selected for main course quiz";
        }
      } else if (formData.quizType === "mini_course") {
        // For mini_course, miniCourseId is required, courseId must be null
        if (!formData.miniCourseId) {
          newErrors.miniCourseId = "Mini course is required for mini course quiz";
        }
        if (formData.courseId) {
          newErrors.courseId = "Course cannot be selected for mini course quiz";
        }
      } else if (formData.quizType === "global") {
        // For global, both courseId and miniCourseId must be null
        if (formData.courseId) {
          newErrors.courseId = "Course cannot be selected for global quiz";
        }
        if (formData.miniCourseId) {
          newErrors.miniCourseId = "Mini course cannot be selected for global quiz";
        }
      }

      // Validate organization for superadmin (required)
      if (role === "superadmin" && !formData.orgId) {
        newErrors.orgId = "Please select an organization";
      }
    } else if (step === 3) {
      // Step 3: Quiz Details
      if (!formData.title || formData.title.trim().length < 3) {
        newErrors.title = "Title must be at least 3 characters";
      }
    } else if (step === 4) {
      // Step 4: Questions
      if (questions.length === 0) {
        newErrors.questions = "At least one question is required";
      }

      // Validate each question
      questions.forEach((q, index) => {
        if (!q.questionText || q.questionText.trim().length === 0) {
          newErrors[`question_${index}_text`] = "Question text is required";
        }
        if (q.marks <= 0) {
          newErrors[`question_${index}_marks`] = "Question marks must be greater than 0";
        }
        if (["multiple_choice", "true_false"].includes(q.questionType)) {
          if (q.options.length < 2) {
            newErrors[`question_${index}_options`] = "At least 2 options are required";
          }
          const hasCorrect = q.options.some((opt) => opt.isCorrect);
          if (!hasCorrect) {
            newErrors[`question_${index}_correct`] = "At least one option must be marked as correct";
          }
          q.options.forEach((opt, optIndex) => {
            if (!opt.optionText || opt.optionText.trim().length === 0) {
              newErrors[`question_${index}_option_${optIndex}`] = "Option text is required";
            }
          });
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Full validation (for final submit)
  const validate = () => {
    // Validate all steps
    for (let step = 1; step <= totalSteps; step++) {
      if (!validateStep(step)) {
        return false;
      }
    }

    // Additional validations
    const newErrors = {};

    if (formData.totalMarks <= 0) {
      newErrors.totalMarks = "Total marks must be greater than 0";
    }
    if (formData.passingMarks < 0 || formData.passingMarks > formData.totalMarks) {
      newErrors.passingMarks = `Passing marks must be between 0 and ${formData.totalMarks}`;
    }
    if (formData.timeLimitMinutes !== null && formData.timeLimitMinutes <= 0) {
      newErrors.timeLimitMinutes = "Time limit must be greater than 0";
    }
    if (formData.maxAttempts <= 0) {
      newErrors.maxAttempts = "Max attempts must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/quizzes", data);
      if (!response.success) {
        throw new Error(response.error || "Failed to create quiz");
      }
      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      const status = variables.status || "draft";
      const statusText = status === "published" ? "published" : "saved as draft";
      createAlert({
        icon: "success",
        title: "Success!",
        text: `Quiz ${statusText} successfully`,
      });
      // Navigate after a short delay to allow toast to show
      setTimeout(() => {
        const dashboardPath =
          role === "superadmin"
            ? "/dashboards/superadmin-manage-quiz"
            : role === "admin"
            ? "/dashboards/admin-manage-quiz"
            : "/dashboards/instructor-manage-quiz";
        router.push(dashboardPath);
      }, 500);
    },
    onError: (error) => {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to create quiz",
      });
    },
  });

  // Update quiz mutation
  const updateQuizMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/quizzes/${quizId}`, data);
      if (!response.success) {
        throw new Error(response.error || "Failed to update quiz");
      }
      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
      const status = variables.status || "draft";
      const statusText = status === "published" ? "published" : "saved as draft";
      createAlert({
        icon: "success",
        title: "Success!",
        text: `Quiz ${statusText} successfully`,
      });
      // Navigate after a short delay to allow toast to show
      setTimeout(() => {
        const dashboardPath =
          role === "superadmin"
            ? "/dashboards/superadmin-manage-quiz"
            : role === "admin"
            ? "/dashboards/admin-manage-quiz"
            : "/dashboards/instructor-manage-quiz";
        router.push(dashboardPath);
      }, 500);
    },
    onError: (error) => {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to update quiz",
      });
    },
  });

  // Handle form submit
  const handleSubmit = async (e, status = "draft") => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare questions for API
      const questionsForAPI = questions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType,
        marks: q.marks,
        options:
          ["multiple_choice", "true_false"].includes(q.questionType)
            ? q.options.map((opt) => ({
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
              }))
            : undefined,
      }));

      // For admin and superadmin, use selected instructor as created_by (or current user if not selected)
      // For instructor, use current user as created_by
      const createdBy = (role === "admin" || role === "superadmin") 
        ? (formData.instructorId || user?.id) // Use selected instructor, or fallback to current user
        : user?.id;

      const submitData = {
        ...formData,
        createdBy, // Set created_by to selected instructor (admin/superadmin) or current user (instructor)
        status,
        questions: questionsForAPI,
        quizType: formData.quizType || "main_course", // Default to main_course for backward compatibility
        miniCourseId: formData.quizType === "mini_course" ? formData.miniCourseId : null,
        courseId: formData.quizType === "main_course" ? formData.courseId : null,
        cohortIds: formData.cohortIds && formData.cohortIds.length > 0 ? formData.cohortIds : null,
        adminId: formData.quizType === "global" && (role === "admin" || role === "superadmin") ? (formData.adminId || user?.id) : null,
      };

      // Remove instructorId from submit data (it's only used to set createdBy)
      delete submitData.instructorId;

      if (isEditMode) {
        await updateQuizMutation.mutateAsync(submitData);
      } else {
        await createQuizMutation.mutateAsync(submitData);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} quiz:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine available quiz types based on role
  const getAvailableQuizTypes = () => {
    if (role === "instructor") {
      return [
        { value: "main_course", label: "Main Course Quiz", description: "Quiz linked to a main course" },
      ];
    } else if (role === "admin") {
      return [
        { value: "main_course", label: "Main Course Quiz", description: "Quiz linked to a main course with cohort filtering" },
        { value: "mini_course", label: "Mini Course Quiz", description: "Quiz linked to a mini course" },
        { value: "global", label: "Global Quiz", description: "Organization-level quiz available to all students" },
      ];
    } else if (role === "superadmin") {
      return [
        { value: "main_course", label: "Main Course Quiz", description: "Quiz linked to a main course with cohort filtering" },
        { value: "mini_course", label: "Mini Course Quiz", description: "Quiz linked to a mini course" },
        { value: "global", label: "Global Quiz", description: "Organization-level quiz available to all students" },
      ];
    }
    return [];
  };

  const availableQuizTypes = getAvailableQuizTypes();

  // Show loading state while fetching quiz data in edit mode
  if (isEditMode && isLoadingQuizData) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-gray-500">Loading quiz data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <React.Fragment key={step}>
              <button
                type="button"
                onClick={() => goToStep(step)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === step
                    ? "bg-primaryColor text-white"
                    : currentStep > step
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
                disabled={isSubmitting}
              >
                {step}
              </button>
              {step < totalSteps && (
                <div
                  className={`w-8 h-1 ${
                    currentStep > step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          Step {currentStep} of {totalSteps}
        </div>
      </div>

      {/* Step Labels */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
          {currentStep === 1 && "Step 1: Quiz Type Selection"}
          {currentStep === 2 && "Step 2: Assignment"}
          {currentStep === 3 && "Step 3: Quiz Details"}
          {currentStep === 4 && "Step 4: Questions"}
          {currentStep === 5 && "Step 5: Quiz Settings"}
          {currentStep === 6 && "Step 6: Review & Publish"}
        </h2>
      </div>

      <form onSubmit={(e) => handleSubmit(e, formData.status)} className="space-y-6">
        {/* Step 1: Quiz Type Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the type of quiz you want to create. This determines how the quiz will be assigned and accessed.
            </p>
            {availableQuizTypes.map((type) => (
              <label
                key={type.value}
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.quizType === type.value
                    ? "border-primaryColor bg-primaryColor/10"
                    : "border-borderColor dark:border-borderColor-dark hover:border-primaryColor/50"
                }`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="quizType"
                    value={type.value}
                    checked={formData.quizType === type.value}
                    onChange={(e) => handleChange("quizType", e.target.value)}
                    className="mt-1 mr-3"
                    disabled={isSubmitting || isEditMode}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-blackColor dark:text-blackColor-dark">
                      {type.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {type.description}
                    </div>
                  </div>
                </div>
              </label>
            ))}
            {errors.quizType && <FieldError>{errors.quizType}</FieldError>}
          </div>
        )}

        {/* Step 2: Assignment (conditional based on quiz type) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Organization Selection (Superadmin only) */}
            {role === "superadmin" && (
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Organization <span className="text-red-500">*</span>
          </label>
          <AdvancedDropdown
            options={orgOptions.filter(opt => opt.value !== null)} // Remove "Global" option since org is required
            value={formData.orgId}
            onChange={(value) => handleChange("orgId", value)}
            placeholder="Select organization..."
            searchable={true}
            disabled={isEditMode || isSubmitting}
            loading={false}
          />
          {isEditMode && (
            <p className="text-xs text-gray-500 mt-1">
              Organization cannot be changed after quiz creation
            </p>
          )}
          {!isEditMode && (
            <p className="text-xs text-gray-500 mt-1">
              Select an organization to filter instructors and courses
            </p>
          )}
          {errors.orgId && <FieldError>{errors.orgId}</FieldError>}
            </div>
          )}

            {/* Conditional Assignment UI based on quiz type */}
            {formData.quizType === "main_course" && (
              <>
                {/* Instructor Selection (Admin and Superadmin only) */}
                {(role === "admin" || role === "superadmin") && (
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Instructor (Optional)
          </label>
          <AdvancedDropdown
            options={instructorOptions}
            value={formData.instructorId === null ? "none" : formData.instructorId}
            onChange={(value) => handleChange("instructorId", value === "none" ? null : value)}
            placeholder="Select instructor (optional)..."
            searchable={true}
            disabled={isEditMode || isSubmitting || isLoadingInstructors}
            loading={isLoadingInstructors}
          />
          {isEditMode && (
            <p className="text-xs text-gray-500 mt-1">
              Instructor cannot be changed after quiz creation
            </p>
          )}
          {!isEditMode && (
            <p className="text-xs text-gray-500 mt-1">
              Optionally select an instructor who will own this quiz. If selected, courses will be filtered by this instructor.
            </p>
          )}
          {role === "superadmin" && !formData.orgId && !isEditMode && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Please select an organization first to see instructors
            </p>
          )}
          {role === "superadmin" && formData.orgId && instructors.length === 0 && !isLoadingInstructors && !isEditMode && (
            <p className="text-sm text-gray-500 mt-1">
              No instructors found in the selected organization
            </p>
          )}
          {errors.instructorId && <FieldError>{errors.instructorId}</FieldError>}
        </div>
      )}

      {/* Course Selection (Optional for all roles) */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Course (Optional)
        </label>
        <AdvancedDropdown
          options={courseOptions}
          value={formData.courseId === null ? "none" : formData.courseId}
          onChange={(value) => handleChange("courseId", value === "none" ? null : value)}
          placeholder="Select a course or leave for standalone quiz..."
          searchable={true}
          paginated={true}
          pagination={coursesPagination}
          onPageChange={(page) => setCoursesPage(page)}
          onSearch={(search) => {
            setCoursesSearch(search);
            setCoursesPage(1); // Reset to first page on search
          }}
          loading={isLoadingCourses || isLoadingQuizData}
          disabled={isLoadingCourses || isLoadingQuizData || isSubmitting || isEditMode}
        />
        {isEditMode && (
          <p className="text-xs text-gray-500 mt-1">
            Course cannot be changed after quiz creation
          </p>
        )}
        {!isEditMode && (
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for standalone quiz, or link to a course
          </p>
        )}
        {role === "instructor" && courses.length === 0 && !isLoadingCourses && !isEditMode && (
          <p className="text-sm text-gray-500 mt-1">
            No courses found. You can create a standalone quiz or create a course first.
          </p>
        )}
        {(role === "admin" || role === "superadmin") && formData.instructorId && courses.length === 0 && !isLoadingCourses && !isEditMode && (
          <p className="text-sm text-gray-500 mt-1">
            No courses found matching the selected instructor&apos;s classes/subjects/cohorts. You can create a standalone quiz or the instructor needs to be assigned to classes/subjects first.
          </p>
        )}
        {(role === "admin" || role === "superadmin") && !formData.instructorId && courses.length > 0 && !isEditMode && (
          <p className="text-xs text-gray-500 mt-1">
            Showing all available courses in your organization. Select an instructor to filter courses by their classes/subjects/cohorts.
          </p>
        )}
        {(role === "admin" || role === "superadmin") && formData.instructorId && courses.length > 0 && !isLoadingCourses && !isEditMode && (
          <p className="text-xs text-gray-500 mt-1">
            Showing courses matching the selected instructor&apos;s classes/subjects/cohorts.
          </p>
        )}
                </div>

                {/* Cohort Filter (Admin and Superadmin only, for main_course) */}
                {(role === "admin" || role === "superadmin") && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                      Filter Courses by Cohorts (Optional)
                    </label>
                    <CohortFilter
                      orgId={formData.orgId || user?.orgId}
                      instructorId={formData.instructorId || null}
                      onCohortChange={(cohortIds) => handleChange("cohortIds", cohortIds)}
                      onCoursesChange={(courses) => setFilteredCoursesFromCohort(courses)}
                      disabled={isSubmitting || isEditMode}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Select cohorts to filter available courses. Courses matching the selected cohorts will be shown above.
                    </p>
                  </div>
                )}
              </>
            )}

            {formData.quizType === "mini_course" && (
              <div>
                <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Create or Select Mini Course <span className="text-red-500">*</span>
                </label>
                <MiniCourseForm
                  onSuccess={(miniCourseId) => {
                    handleChange("miniCourseId", miniCourseId);
                  }}
                  orgId={formData.orgId || user?.orgId}
                  disabled={isSubmitting || isEditMode}
                />
                {errors.miniCourseId && <FieldError>{errors.miniCourseId}</FieldError>}
                <p className="text-xs text-gray-500 mt-2">
                  Create a new mini course or select an existing one. The mini course will be linked to this quiz.
                </p>
              </div>
            )}

            {formData.quizType === "global" && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Global quizzes are available to all students in the organization. No course or mini course assignment is needed.
                </p>
                {(role === "admin" || role === "superadmin") && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                      Admin (Optional)
                    </label>
                    <p className="text-xs text-gray-500">
                      This quiz will be created by you ({user?.name || user?.email}). You can optionally assign it to another admin.
                    </p>
                  </div>
                )}
              </div>
            )}

            {errors.courseId && <FieldError>{errors.courseId}</FieldError>}
            {errors.miniCourseId && <FieldError>{errors.miniCourseId}</FieldError>}
          </div>
        )}

        {/* Step 3: Quiz Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Title */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter quiz title"
          disabled={isSubmitting}
        />
        {errors.title && <FieldError>{errors.title}</FieldError>}
      </div>

      {/* Description */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter quiz description"
          disabled={isSubmitting}
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Instructions
        </label>
        <textarea
          value={formData.instructions}
          onChange={(e) => handleChange("instructions", e.target.value)}
          rows={4}
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter quiz instructions for students"
          disabled={isSubmitting}
        />
      </div>

      {/* Marks Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Total Marks <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.totalMarks}
            onChange={(e) => handleChange("totalMarks", parseFloat(e.target.value) || 0)}
            min="1"
            step="0.01"
            className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            disabled={isSubmitting}
          />
          {errors.totalMarks && <FieldError>{errors.totalMarks}</FieldError>}
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Passing Marks
          </label>
          <input
            type="number"
            value={formData.passingMarks}
            onChange={(e) => handleChange("passingMarks", parseFloat(e.target.value) || 0)}
            min="0"
            max={formData.totalMarks}
            step="0.01"
            className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            disabled={isSubmitting}
          />
          {errors.passingMarks && <FieldError>{errors.passingMarks}</FieldError>}
        </div>
      </div>

      {/* Time Limit */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Time Limit (Minutes) - Optional
        </label>
        <input
          type="number"
          value={formData.timeLimitMinutes || ""}
          onChange={(e) =>
            handleChange("timeLimitMinutes", e.target.value ? parseInt(e.target.value) : null)
          }
          min="1"
          className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Leave empty for no time limit"
          disabled={isSubmitting}
        />
        {errors.timeLimitMinutes && <FieldError>{errors.timeLimitMinutes}</FieldError>}
        <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited time</p>
            </div>

            {/* Max Attempts */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Max Attempts <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.maxAttempts}
                onChange={(e) => handleChange("maxAttempts", parseInt(e.target.value) || 1)}
                min="1"
                className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                disabled={isSubmitting}
              />
              {errors.maxAttempts && <FieldError>{errors.maxAttempts}</FieldError>}
            </div>
          </div>
        )}

        {/* Step 4: Questions (with drag-and-drop) */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Questions <span className="text-red-500">*</span>
              </h3>
              <button
                type="button"
                onClick={addQuestion}
                className="px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 disabled:opacity-50"
                disabled={isSubmitting}
              >
                + Add Question
              </button>
            </div>
            {errors.questions && <FieldError>{errors.questions}</FieldError>}

            {questions.length > 0 ? (
              <SortableContainer
                items={questions}
                onReorder={reorderQuestions}
                className="space-y-4"
                disabled={isSubmitting}
              >
                {questions.map((question, qIndex) => (
                  <SortableItem key={question.id} id={question.id} disabled={isSubmitting}>
                    <div className="p-4 border-2 border-borderColor dark:border-borderColor-dark rounded-md space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="text-md font-semibold text-blackColor dark:text-blackColor-dark">
                          Question {qIndex + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(question.id)}
                          className="px-2 py-1 text-sm bg-red-500 text-white rounded disabled:opacity-50"
                          disabled={isSubmitting}
                          title="Delete Question"
                        >
                          × Delete
                        </button>
                      </div>

            {/* Question Type */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Question Type
              </label>
              <select
                value={question.questionType}
                onChange={(e) => {
                  updateQuestion(question.id, "questionType", e.target.value);
                  // Reset options for new type
                  if (["multiple_choice", "true_false"].includes(e.target.value)) {
                    updateQuestion(question.id, "options", [
                      { id: "1", optionText: "", isCorrect: false },
                      { id: "2", optionText: "", isCorrect: false },
                    ]);
                  } else {
                    updateQuestion(question.id, "options", []);
                  }
                }}
                className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                disabled={isSubmitting}
              >
                {questionTypes.map((type) => (
                  <option key={type.id} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Text */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question.questionText}
                onChange={(e) =>
                  updateQuestion(question.id, "questionText", e.target.value)
                }
                rows={3}
                className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                placeholder="Enter question text"
                disabled={isSubmitting}
              />
              {errors[`question_${qIndex}_text`] && (
                <FieldError>{errors[`question_${qIndex}_text`]}</FieldError>
              )}
            </div>

            {/* Marks */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={question.marks}
                onChange={(e) =>
                  updateQuestion(question.id, "marks", parseFloat(e.target.value) || 0)
                }
                min="0.01"
                step="0.01"
                className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                disabled={isSubmitting}
              />
              {errors[`question_${qIndex}_marks`] && (
                <FieldError>{errors[`question_${qIndex}_marks`]}</FieldError>
              )}
            </div>

            {/* Options for Multiple Choice and True/False */}
            {["multiple_choice", "true_false"].includes(question.questionType) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    Options <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => addOption(question.id)}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    + Add Option
                  </button>
                </div>
                {errors[`question_${qIndex}_options`] && (
                  <FieldError>{errors[`question_${qIndex}_options`]}</FieldError>
                )}
                {errors[`question_${qIndex}_correct`] && (
                  <FieldError>{errors[`question_${qIndex}_correct`]}</FieldError>
                )}

                {question.options.map((option, optIndex) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(e) =>
                        updateOption(question.id, option.id, "isCorrect", e.target.checked)
                      }
                      className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor"
                      disabled={isSubmitting}
                    />
                    <input
                      type="text"
                      value={option.optionText}
                      onChange={(e) =>
                        updateOption(question.id, option.id, "optionText", e.target.value)
                      }
                      className="flex-1 py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                      placeholder="Enter option text"
                      disabled={isSubmitting}
                    />
                    {question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => deleteOption(question.id, option.id)}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded disabled:opacity-50"
                        disabled={isSubmitting}
                        title="Delete Option"
                      >
                        ×
                      </button>
                    )}
                    {errors[`question_${qIndex}_option_${optIndex}`] && (
                      <FieldError>{errors[`question_${qIndex}_option_${optIndex}`]}</FieldError>
                    )}
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  Check the box next to the correct answer(s)
                </p>
                      </div>
                    )}
                    </div>
                  </SortableItem>
                ))}
              </SortableContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No questions added yet. Click &quot;Add Question&quot; to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Quiz Settings */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                Quiz Settings
              </h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showResultsImmediately"
                    checked={formData.showResultsImmediately}
                    onChange={(e) => handleChange("showResultsImmediately", e.target.checked)}
                    className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="showResultsImmediately"
                    className="ml-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark"
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
                    className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="showCorrectAnswers"
                    className="ml-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark"
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
                    className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="randomizeQuestions"
                    className="ml-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark"
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
                    className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="randomizeOptions"
                    className="ml-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark"
                  >
                    Randomize Options
                  </label>
                </div>
              </div>
            </div>

            {/* Date Range (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={startDateLocal}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const isoValue = dateTimeLocalToIso(value);
                      if (isoValue) {
                        handleChange("startDate", isoValue);
                      }
                    } else {
                      handleChange("startDate", null);
                    }
                  }}
                  className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  End Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={endDateLocal}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const isoValue = dateTimeLocalToIso(value);
                      if (isoValue) {
                        handleChange("endDate", isoValue);
                      }
                    } else {
                      handleChange("endDate", null);
                    }
                  }}
                  className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Publish */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
                Quiz Summary
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Quiz Type</label>
                  <p className="text-blackColor dark:text-blackColor-dark">
                    {formData.quizType === "main_course" && "Main Course Quiz"}
                    {formData.quizType === "mini_course" && "Mini Course Quiz"}
                    {formData.quizType === "global" && "Global Quiz"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Title</label>
                  <p className="text-blackColor dark:text-blackColor-dark">{formData.title || "Not set"}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Marks</label>
                  <p className="text-blackColor dark:text-blackColor-dark">{formData.totalMarks}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Passing Marks</label>
                  <p className="text-blackColor dark:text-blackColor-dark">{formData.passingMarks}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Time Limit</label>
                  <p className="text-blackColor dark:text-blackColor-dark">
                    {formData.timeLimitMinutes ? `${formData.timeLimitMinutes} minutes` : "Unlimited"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Max Attempts</label>
                  <p className="text-blackColor dark:text-blackColor-dark">{formData.maxAttempts}</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Questions</label>
                  <p className="text-blackColor dark:text-blackColor-dark">{questions.length} question(s)</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status</label>
                  <p className="text-blackColor dark:text-blackColor-dark capitalize">{formData.status}</p>
                </div>
              </div>

              {formData.description && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Description</label>
                  <p className="text-blackColor dark:text-blackColor-dark mt-1">{formData.description}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Settings</label>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-blackColor dark:text-blackColor-dark">
                    {formData.showResultsImmediately && "✓ Show Results Immediately"}
                  </p>
                  <p className="text-sm text-blackColor dark:text-blackColor-dark">
                    {formData.showCorrectAnswers && "✓ Show Correct Answers"}
                  </p>
                  <p className="text-sm text-blackColor dark:text-blackColor-dark">
                    {formData.randomizeQuestions && "✓ Randomize Questions"}
                  </p>
                  <p className="text-sm text-blackColor dark:text-blackColor-dark">
                    {formData.randomizeOptions && "✓ Randomize Options"}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Final Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                disabled={isSubmitting}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-borderColor dark:border-borderColor-dark">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep(currentStep)) {
                  nextStep();
                }
              }}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e, "draft");
                }}
                disabled={isSubmitting || isLoadingQuizData}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update as Draft" : "Save as Draft")}
              </button>
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e, "published");
                }}
                disabled={isSubmitting || isLoadingQuizData}
                className="px-6 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (isEditMode ? "Updating..." : "Publishing...") : (isEditMode ? "Update Quiz" : "Publish Quiz")}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddQuizForm;

