"use client";

import { useState, useEffect, useMemo } from "react";
import checkImage1 from "@/assets/images/dashbord/check__1.png";
import ButtonPrimary from "@/components/shared/buttons/ButtonPrimary";
import Image from "next/image";
import Link from "next/link";
import MultiSelect from "@/components/shared/forms/MultiSelect";
import { useMyInstructorRequest, useCreateInstructorRequest } from "@/hooks/api/useInstructorRequest";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import PromotionSuccessModal from "@/components/shared/modals/PromotionSuccessModal";

const BecomeAnInstructorPrimary = () => {
  const user = useAuthStore((state) => state.user);
  const userOrgId = user?.orgId;
  const createAlert = useSweetAlert();

  // Form state
  const [formData, setFormData] = useState({
    cohorts: [],
    subjects: [],
    phone_number: "",
    bio: "",
    privacy_agreed: false,
  });

  // Validation errors (only set on submit)
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's current request status
  const { data: myRequest, isLoading: isLoadingRequest } = useMyInstructorRequest();

  // Fetch cohorts for the organization (using custom endpoint for regular users)
  const { data: cohortsData, isLoading: isLoadingCohorts } = useQuery({
    queryKey: ['instructor-requests', 'cohorts'],
    queryFn: async () => {
      const response = await apiClient.get('/instructor-requests/cohorts');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch cohorts');
      }
      return response.data || [];
    },
    enabled: !!userOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch subjects based on selected cohorts
  const selectedCohortIds = formData.cohorts;
  const { data: subjectsData, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['instructor-requests', 'subjects', selectedCohortIds],
    queryFn: async () => {
      if (selectedCohortIds.length === 0) return [];
      const cohortIdsParam = selectedCohortIds.join(',');
      const response = await apiClient.get(
        `/instructor-requests/subjects?cohort_ids=${cohortIdsParam}`
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch subjects');
      }
      return response.data || [];
    },
    enabled: selectedCohortIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create request mutation
  const createRequestMutation = useCreateInstructorRequest({
    onSuccess: () => {
      createAlert("success", "Your instructor request has been submitted successfully!");
      // Reset form
      setFormData({
        cohorts: [],
        subjects: [],
        phone_number: "",
        bio: "",
        privacy_agreed: false,
      });
      setErrors({});
    },
  });

  // Prepare cohort options with program node display
  const cohortOptions = useMemo(() => {
    if (!cohortsData || !Array.isArray(cohortsData)) return [];
    return cohortsData.map((cohort) => ({
      id: cohort.id,
      value: cohort.id,
      label: cohort.label || `${cohort.cohort_code}${cohort.program_node?.name ? ` - ${cohort.program_node.name}` : ''}${cohort.section?.name ? ` (${cohort.section.name})` : ''}`,
      ...cohort,
    }));
  }, [cohortsData]);

  // Prepare subject options
  const subjectOptions = useMemo(() => {
    if (!subjectsData || !Array.isArray(subjectsData)) return [];
    return subjectsData.map((subject) => ({
      id: subject.id,
      value: subject.id,
      label: subject.label || `${subject.code || ""} - ${subject.name}`.trim(),
      ...subject,
    }));
  }, [subjectsData]);

  // Reset subjects when cohorts change
  useEffect(() => {
    if (formData.cohorts.length === 0) {
      setFormData((prev) => ({ ...prev, subjects: [] }));
    }
  }, [formData.cohorts]);

  // Check if user has pending request
  const hasPendingRequest = myRequest?.status === "pending";
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Show success modal when request is accepted
  useEffect(() => {
    if (myRequest?.status === "accepted" && !showSuccessModal) {
      setShowSuccessModal(true);
    }
  }, [myRequest?.status, showSuccessModal]);

  // Validate form (only called on submit)
  const validateForm = () => {
    const newErrors = {};

    if (formData.cohorts.length === 0) {
      newErrors.cohorts = "Please select at least one cohort";
    }

    if (formData.subjects.length === 0) {
      newErrors.subjects = "Please select at least one subject";
    }

    if (formData.phone_number && formData.phone_number.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.phone_number.trim())) {
        newErrors.phone_number = "Invalid phone number format";
      }
    }

    if (formData.bio && formData.bio.trim().length > 2000) {
      newErrors.bio = "Bio must be less than 2000 characters";
    }

    if (!formData.privacy_agreed) {
      newErrors.privacy_agreed = "You must agree to the privacy policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user has pending request
    if (hasPendingRequest) {
      createAlert("warning", "You already have a pending instructor request. Please wait for it to be reviewed.");
      return;
    }

    // Validate form
    if (!validateForm()) {
      createAlert("error", "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract just the IDs - API expects array of UUID strings, not objects
      const cohortIds = formData.cohorts.map((cohortId) => {
        // Handle both string IDs and object IDs
        return typeof cohortId === 'string' ? cohortId : (cohortId?.id || cohortId);
      });

      const subjectIds = formData.subjects.map((subjectId) => {
        // Handle both string IDs and object IDs
        return typeof subjectId === 'string' ? subjectId : (subjectId?.id || subjectId);
      });

      await createRequestMutation.mutateAsync({
        cohorts: cohortIds,
        subjects: subjectIds,
        phone_number: formData.phone_number?.trim() || null,
        bio: formData.bio?.trim() || null,
      });
    } catch (error) {
      console.error("Submit error:", error);
      // Error is handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Show loading or pending request message
  if (isLoadingRequest) {
    return (
      <section>
        <div className="container pt-100px pb-100px">
          <div className="text-center py-50px">
            <p className="text-contentColor dark:text-contentColor-dark">
              Loading...
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Show message if request is pending
  if (hasPendingRequest) {
    return (
      <section>
        <div className="container pt-100px pb-100px">
          <div className="bg-primaryColor/10 dark:bg-primaryColor/20 p-30px rounded-md border-2 border-primaryColor">
            <h3 className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-15px">
              Request Pending
            </h3>
            <p className="text-contentColor dark:text-contentColor-dark leading-1.8 mb-15px">
              You have a pending instructor request. Please wait for the organization admin to review your request.
            </p>
            <p className="text-contentColor dark:text-contentColor-dark leading-1.8">
              Request submitted on: {new Date(myRequest.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Check if request was rejected (but still show form)
  const isRejected = myRequest?.status === "rejected";

  // Show success modal if request was accepted
  if (myRequest?.status === "accepted") {
    return (
      <>
        <section>
          <div className="container pt-100px pb-100px">
            <div className="bg-green-50 dark:bg-green-900/20 p-30px rounded-md border-2 border-green-500">
              <h3 className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-15px">
                Request Accepted
              </h3>
              <p className="text-contentColor dark:text-contentColor-dark leading-1.8 mb-15px">
                Your instructor request has been accepted! Please check the promotion success modal.
              </p>
            </div>
          </div>
        </section>
        <PromotionSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
        />
      </>
    );
  }

  return (
    <section>
      <div className="container pt-100px pb-100px" data-aos="fade-up">
        {/* Show rejection message if request was rejected */}
        {isRejected && (
          <div className="mb-30px bg-red-50 dark:bg-red-900/20 p-30px rounded-md border-2 border-red-500">
            <h3 className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-15px">
              Request Rejected
            </h3>
            <p className="text-contentColor dark:text-contentColor-dark leading-1.8 mb-15px">
              {myRequest.rejection_reason
                ? `Your request was rejected. Reason: ${myRequest.rejection_reason}`
                : "Your request was rejected. You can submit a new request if needed."}
            </p>
            <p className="text-contentColor dark:text-contentColor-dark leading-1.8 mb-15px">
              Rejected on: {new Date(myRequest.reviewed_at).toLocaleString()}
            </p>
            <p className="text-contentColor dark:text-contentColor-dark leading-1.8">
              You can submit a new request using the form below.
            </p>
          </div>
        )}
        
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark leading-1.2 pb-15px border-b border-borderColor dark:border-borderColor-dark mb-10">
          Apply As Instructor
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-30px">
          {/* apply left */}
          <div data-aos="fade-up">
            <h6 className="text-2xl font-semibold text-blackColor dark:text-blackColor-dark leading-1.8 mb-15px">
              Become an Instructor
            </h6>
            <p className="text-contentColor dark:text-contentColor-dark leading-1.8 mb-15px mt-5">
              Apply to become an instructor in your organization. Select the cohorts
              and subjects you want to teach, and submit your request for review by
              the organization admin.
            </p>
            <h6 className="text-2xl font-semibold text-blackColor dark:text-blackColor-dark leading-1.8 mb-15px">
              Instructor Requirements
            </h6>
            <p className="text-contentColor dark:text-contentColor-dark leading-1.8 mb-15px mt-5">
              To become an instructor, you must:
            </p>
            {/* rules list */}
            <ul className="mb-30px space">
              <li className="mt-5 flex items-center gap-5">
                <div className="h-25px w-25px">
                  <Image src={checkImage1} alt="" className="w-full" />
                </div>
                <p className="text-contentColor dark:text-contentColor-dark leading-1.8">
                  Select at least one cohort (class) you want to teach
                </p>
              </li>
              <li className="mt-5 flex items-center gap-5">
                <div className="h-25px w-25px">
                  <Image src={checkImage1} alt="" className="w-full" />
                </div>
                <p className="text-contentColor dark:text-contentColor-dark leading-1.8">
                  Select at least one subject for each selected cohort
                </p>
              </li>
              <li className="mt-5 flex items-center gap-5">
                <div className="h-25px w-25px">
                  <Image src={checkImage1} alt="" className="w-full" />
                </div>
                <p className="text-contentColor dark:text-contentColor-dark leading-1.8">
                  Provide your contact information and bio (optional)
                </p>
              </li>
              <li className="mt-5 flex items-center gap-5">
                <div className="h-25px w-25px">
                  <Image src={checkImage1} alt="" className="w-full" />
                </div>
                <p className="text-contentColor dark:text-contentColor-dark leading-1.8">
                  Agree to the privacy policy
                </p>
              </li>
            </ul>
          </div>
          {/* apply right */}
          <div data-aos="fade-up">
            <form
              onSubmit={handleSubmit}
              className="p-10px md:p-10 lg:p-5 2xl:p-10 mb-50px bg-darkdeep3 dark:bg-darkdeep3-dark text-sm text-blackColor dark:text-blackColor-dark leading-1.8"
              data-aos="fade-up"
            >
              <div className="grid grid-cols-1 mb-15px gap-15px">
                {/* Cohorts Multi-Select */}
                <div>
                  <MultiSelect
                    label="Cohorts (Classes) *"
                    options={cohortOptions}
                    selected={formData.cohorts}
                    onChange={(value) => handleChange("cohorts", value)}
                    placeholder="Select cohorts..."
                    error={errors.cohorts}
                    disabled={isLoadingCohorts || isSubmitting}
                    searchable={true}
                  />
                  {isLoadingCohorts && (
                    <p className="mt-1 text-xs text-contentColor dark:text-contentColor-dark">
                      Loading cohorts...
                    </p>
                  )}
                </div>

                {/* Subjects Multi-Select */}
                <div>
                  <MultiSelect
                    label="Subjects *"
                    options={subjectOptions}
                    selected={formData.subjects}
                    onChange={(value) => handleChange("subjects", value)}
                    placeholder={
                      formData.cohorts.length === 0
                        ? "Please select cohorts first"
                        : "Select subjects..."
                    }
                    error={errors.subjects}
                    disabled={
                      formData.cohorts.length === 0 ||
                      isLoadingSubjects ||
                      isSubmitting
                    }
                    searchable={true}
                  />
                  {formData.cohorts.length === 0 && (
                    <p className="mt-1 text-xs text-contentColor dark:text-contentColor-dark">
                      Select cohorts first to see available subjects
                    </p>
                  )}
                  {isLoadingSubjects && formData.cohorts.length > 0 && (
                    <p className="mt-1 text-xs text-contentColor dark:text-contentColor-dark">
                      Loading subjects...
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="mb-3 block font-semibold">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+1-234-567-8900"
                    value={formData.phone_number}
                    onChange={(e) => handleChange("phone_number", e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full py-10px px-5 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                      errors.phone_number
                        ? "border-red-500"
                        : "border-borderColor dark:border-borderColor-dark"
                    } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md font-no ${
                      isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                  {errors.phone_number && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.phone_number}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="mb-3 block font-semibold">Bio (Optional)</label>
                  <textarea
                    placeholder="Tell us about yourself and your teaching experience..."
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full py-10px px-5 text-sm text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
                      errors.bio
                        ? "border-red-500"
                        : "border-borderColor dark:border-borderColor-dark"
                    } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md ${
                      isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    cols="30"
                    rows="6"
                    maxLength={2000}
                  />
                  <p className="mt-1 text-xs text-contentColor dark:text-contentColor-dark">
                    {formData.bio.length}/2000 characters
                  </p>
                  {errors.bio && (
                    <p className="mt-1 text-sm text-red-500">{errors.bio}</p>
                  )}
                </div>
              </div>

              {/* Privacy Policy Checkbox */}
              <div className="mb-15px">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.privacy_agreed}
                    onChange={(e) =>
                      handleChange("privacy_agreed", e.target.checked)
                    }
                    disabled={isSubmitting}
                    className={`mt-1 w-4 h-4 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-primaryColor ${
                      isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                  <span className="text-size-15 text-contentColor dark:text-contentColor-dark">
                    You agree to our friendly{" "}
                    <Link
                      href="#"
                      className="text-base text-blackColor dark:text-blackColor-dark hover:text-primaryColor dark:hover:text-primaryColor font-bold leading-1 relative before:w-full before:h-1px before:bg-blackColor dark:before:bg-blackColor-dark before:absolute before:left-0 before:-bottom-0.5"
                    >
                      Privacy policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.privacy_agreed && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.privacy_agreed}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="mt-15px">
                <ButtonPrimary
                  type="submit"
                  disabled={isSubmitting || isLoadingCohorts}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </ButtonPrimary>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BecomeAnInstructorPrimary;
