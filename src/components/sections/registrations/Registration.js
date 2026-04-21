"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import registrationImage1 from "@/assets/images/register/register__1.png";
import registrationImage2 from "@/assets/images/register/register__2.png";
import registrationImage3 from "@/assets/images/register/register__3.png";
import PopupVideo from "@/components/shared/popup/PopupVideo";
import ButtonPrimary from "@/components/shared/buttons/ButtonPrimary";
import useSweetAlert from "@/hooks/useSweetAlert";

const Registration = () => {
  const createAlert = useSweetAlert();
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    request_type: "vendor", // "vendor" or "mentor"
    organization_id: "",
    event_interest: false,
    workshop_interest: false,
  });

  // UI state
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch organizations when request_type is "mentor"
  useEffect(() => {
    if (formData.request_type === "mentor") {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setFormData(prev => ({ ...prev, organization_id: "" }));
    }
  }, [formData.request_type]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await fetch("/api/search/orgs?pageSize=100", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.items) {
        setOrganizations(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      createAlert("error", "Failed to load organizations. Please try again.");
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = "Invalid phone number format";
      }
    }

    // For mentor requests, organization is required
    if (formData.request_type === "mentor" && !formData.organization_id) {
      newErrors.organization_id = "Organization is required for mentor registration";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      createAlert("error", "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        request_type: formData.request_type,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        organization_id: formData.request_type === "mentor" ? formData.organization_id : null,
        event_interest: formData.event_interest,
        workshop_interest: formData.workshop_interest,
      };

      const response = await fetch("/api/registration-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit registration request");
      }

      // Success
      setIsSuccess(true);
      createAlert("success", data.data?.message || "Your registration request has been submitted successfully. You will be notified once it is reviewed.");

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        request_type: "vendor",
        organization_id: "",
        event_interest: false,
        workshop_interest: false,
      });
    } catch (error) {
      console.error("Registration error:", error);
      createAlert("error", error.message || "Failed to submit registration request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-register bg-cover bg-center bg-no-repeat lg:mb-150px">
      {/* registration overlay  */}
      <div className="overlay bg-blueDark bg-opacity-90 py-20 lg:pt-[90px] lg:pb-0 relative z-0">
        {/* animate icons  */}
        <div>
          <Image
            className="absolute top-0 left-0 lg:left-[8%] 2xl:top-10 animate-move-hor block z--1"
            src={registrationImage1}
            alt=""
          />
          <Image
            className="absolute top-1/2 left-3/4 md:left-2/3 lg:left-1/2 2xl:left-[8%] md:top animate-spin-slow block z--1"
            src={registrationImage2}
            alt=""
          />
          <Image
            className="absolute top-20 lg:top-3/4 md:top-14 right-20 md:right-20 lg:right-[90%] animate-move-var block z--1"
            src={registrationImage3}
            alt=""
          />
        </div>
        <div className="container">
          {/* about section   */}
          <div className="grid grid-cols-1 lg:grid-cols-12 pt-30px gap-x-30px">
            {/* about left  */}
            <div
              className="mb-30px lg:mb-0 pb-0 md:pb-30px xl:pb-0 lg:col-start-1 lg:col-span-7"
              data-aos="fade-up"
            >
              <div className="relative">
                <span className="text-sm font-semibold text-primaryColor bg-whitegrey3 px-6 py-5px mb-5 rounded-full inline-block">
                  Registration
                </span>
                <h3 className="text-3xl md:text-[35px] 2xl:text-size-42 leading-[45px] 2xl:leading-2xl font-bold text-whiteColor pb-25px">
                  Register Your{" "}
                  <span className="relative after:w-full after:h-[7px] after:bg-secondaryColor after:absolute after:left-0 after:bottom-2 md:after:bottom-4 z-0 after:z-[-1]">
                    Account
                  </span>{" "}
                  Get free access to{" "}
                  <span className="text-yellow1">60000 </span> online course
                </h3>
                <div className="flex gap-x-5 items-center">
                  <PopupVideo />

                  <div>
                    <p className="text-size-15 md:text-[22px] lg:text-lg 2xl:text-[22px] leading-6 md:leading-9 lg:leading-8 2xl:leading-9 font-semibold text-white">
                      Learn Something new & Build Your Career From Anywhere In
                      The World
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* subject right  */}
            <div className="overflow-visible lg:col-start-8 lg:col-span-5 relative z-1 lg:-mb-150px">
              <form
                className="p-35px pt-10 bg-lightGrey10 dark:bg-lightGrey10-dark rounded shadow-experience"
                data-aos="fade-up"
                onSubmit={handleSubmit}
              >
                <h3 className="text-xl text-blackColor dark:text-blackColor-dark font-semibold mb-5 font-inter">
                  Fill Your Registration
                </h3>

                {/* Role Selection */}
                <div className="mb-25px">
                  <label className="block text-sm text-blackColor dark:text-blackColor-dark mb-2 font-medium">
                    I want to register as:
                  </label>
                  <div className="flex gap-x-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="request_type"
                        value="vendor"
                        checked={formData.request_type === "vendor"}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span className="text-base text-blackColor dark:text-blackColor-dark">Vendor</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="request_type"
                        value="mentor"
                        checked={formData.request_type === "mentor"}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span className="text-base text-blackColor dark:text-blackColor-dark">Mentor</span>
                    </label>
                  </div>
                </div>

                {/* First Name */}
                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full px-15px py-3 bg-lightGrey8 text-base mb-25px focus:outline-none ${
                    errors.first_name ? "border border-red-500" : ""
                  }`}
                />
                {errors.first_name && (
                  <p className="text-red-500 text-sm mb-15px -mt-20px">{errors.first_name}</p>
                )}

                {/* Last Name */}
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`w-full px-15px py-3 bg-lightGrey8 text-base mb-25px focus:outline-none ${
                    errors.last_name ? "border border-red-500" : ""
                  }`}
                />
                {errors.last_name && (
                  <p className="text-red-500 text-sm mb-15px -mt-20px">{errors.last_name}</p>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-x-30px">
                  {/* Email */}
                  <div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-15px py-3 bg-lightGrey8 text-base mb-25px focus:outline-none ${
                        errors.email ? "border border-red-500" : ""
                      }`}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mb-15px -mt-20px">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <input
                      type="text"
                      name="phone"
                      placeholder="Phone (Optional)"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-15px py-3 bg-lightGrey8 text-base mb-25px focus:outline-none ${
                        errors.phone ? "border border-red-500" : ""
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mb-15px -mt-20px">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Organization Dropdown (only for Mentor) */}
                {formData.request_type === "mentor" && (
                  <div className="mb-25px">
                    <select
                      name="organization_id"
                      value={formData.organization_id}
                      onChange={handleChange}
                      className={`w-full px-15px py-3 bg-lightGrey8 text-base focus:outline-none ${
                        errors.organization_id ? "border border-red-500" : ""
                      }`}
                      disabled={loadingOrgs}
                    >
                      <option value="">Select Organization {loadingOrgs ? "(Loading...)" : "*"}</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.label || org.name}
                        </option>
                      ))}
                    </select>
                    {errors.organization_id && (
                      <p className="text-red-500 text-sm mt-5px">{errors.organization_id}</p>
                    )}
                  </div>
                )}

                {/* Event/Workshop Interest */}
                <div className="mb-25px space-y-2">
                  <label className="block text-sm text-blackColor dark:text-blackColor-dark mb-2 font-medium">
                    I&apos;m interested in:
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="event_interest"
                      checked={formData.event_interest}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-base text-blackColor dark:text-blackColor-dark">Events</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="workshop_interest"
                      checked={formData.workshop_interest}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-base text-blackColor dark:text-blackColor-dark">Workshops</span>
                  </label>
                </div>

                <div>
                  <ButtonPrimary type="submit" arrow={true} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </ButtonPrimary>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Registration;
