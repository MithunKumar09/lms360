"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import RichTextEditor from "@/components/shared/forms/RichTextEditor.js";
import FieldError from "@/components/shared/errors/FieldError.js";

const AssignMarksSection = ({ submissionId, maxMarks, currentMarks, currentFeedback, currentStatus }) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  const [marks, setMarks] = useState(currentMarks?.toString() || "");
  const [feedback, setFeedback] = useState(currentFeedback || "");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grade mutation
  const gradeMutation = useMutation({
    mutationFn: async ({ marksObtained, feedback, status }) => {
      const response = await apiClient.put(
        `/assignments/submissions/${submissionId}/grade`,
        { marksObtained, feedback, status }
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to grade submission");
      }
      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submission", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["assignments", "instructor"] });
      
      let message = "Marks saved as draft";
      if (variables.status === "graded") {
        message = "Marks submitted successfully";
      } else if (variables.status === "returned") {
        message = "Submission returned to student";
      }
      
      createAlert({
        icon: "success",
        title: "Success!",
        text: message,
      });
    },
    onError: (error) => {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to grade submission",
      });
    },
  });

  const validate = () => {
    const newErrors = {};
    if (marks && marks.trim() !== "") {
      const marksNum = parseFloat(marks);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
        newErrors.marks = `Marks must be between 0 and ${maxMarks}`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      await gradeMutation.mutateAsync({
        marksObtained: marks && marks.trim() !== "" ? parseFloat(marks) : null,
        feedback: feedback,
        status: "submitted", // Keep as submitted, not graded yet
      });
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMarks = async () => {
    if (!validate()) return;
    if (!marks || marks.trim() === "") {
      setErrors({ marks: "Marks are required to submit" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await gradeMutation.mutateAsync({
        marksObtained: parseFloat(marks),
        feedback: feedback,
        status: "graded",
      });
    } catch (error) {
      console.error("Error submitting marks:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToStudent = async () => {
    if (!validate()) return;
    
    createAlert({
      icon: "warning",
      title: "Return to Student?",
      text: "This will mark the submission as returned and notify the student. Continue?",
      showCancelButton: true,
      confirmButtonText: "Yes, return it!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSubmitting(true);
        try {
          await gradeMutation.mutateAsync({
            marksObtained: marks && marks.trim() !== "" ? parseFloat(marks) : null,
            feedback: feedback,
            status: "returned",
          });
        } catch (error) {
          console.error("Error returning submission:", error);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark p-6 space-y-6">
      <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
        Assign Marks
      </h3>

      {/* Marks Input */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Marks Obtained <span className="text-red-500">*</span>
          <span className="text-gray-500 font-normal ml-2">(Max: {maxMarks})</span>
        </label>
        <input
          type="number"
          value={marks}
          onChange={(e) => {
            setMarks(e.target.value);
            if (errors.marks) {
              setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.marks;
                return newErrors;
              });
            }
          }}
          min="0"
          max={maxMarks}
          step="0.01"
          className="w-full max-w-xs py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          placeholder="Enter marks"
          disabled={isSubmitting || currentStatus === "returned"}
        />
        {errors.marks && <FieldError>{errors.marks}</FieldError>}
        {currentMarks !== null && (
          <p className="text-sm text-gray-500 mt-1">
            Current marks: {currentMarks} / {maxMarks}
          </p>
        )}
      </div>

      {/* Feedback Editor */}
      <div>
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Feedback
        </label>
        <div className="border-2 border-borderColor dark:border-borderColor-dark rounded-md">
          <RichTextEditor
            value={feedback}
            onChange={setFeedback}
            placeholder="Enter feedback for the student..."
            className="min-h-[200px]"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Provide detailed feedback to help the student improve
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-borderColor dark:border-borderColor-dark">
        <button
          onClick={handleSaveDraft}
          disabled={isSubmitting || currentStatus === "returned"}
          className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Draft"}
        </button>
        <button
          onClick={handleSubmitMarks}
          disabled={isSubmitting || currentStatus === "returned"}
          className="px-6 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Marks"}
        </button>
        <button
          onClick={handleReturnToStudent}
          disabled={isSubmitting}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Returning..." : "Return to Student"}
        </button>
      </div>

      {/* Status Info */}
      {currentStatus && (
        <div className="pt-4 border-t border-borderColor dark:border-borderColor-dark">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Status: <span className="font-semibold capitalize">{currentStatus}</span>
            {currentStatus === "returned" && (
              <span className="ml-2 text-green-600">✓ Returned to student</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default AssignMarksSection;

