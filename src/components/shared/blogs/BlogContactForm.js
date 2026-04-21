'use client';

import React, { useState } from 'react';
import { useSubmitCourseInquiry } from '@/hooks/api/useCourseInquiries';
import useSweetAlert from '@/hooks/useSweetAlert';

const BlogContactForm = ({ courseId }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = useState({});

  const submitInquiry = useSubmitCourseInquiry();
  const createAlert = useSweetAlert();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (!formData.message || formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    if (formData.message && formData.message.trim().length > 5000) {
      newErrors.message = 'Message must be less than 5000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!courseId) {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: 'Course ID is required to submit inquiry'
      });
      return;
    }

    try {
      await submitInquiry.mutateAsync({
        courseId,
        name: formData.name,
        email: formData.email,
        message: formData.message
      });

      // Success
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Your inquiry has been submitted successfully. We will get back to you soon.'
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        message: ''
      });
      setErrors({});
    } catch (error) {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit inquiry. Please try again.'
      });
    }
  };

  return (
    <div
      className="p-5 md:p-30px lg:p-5 2xl:p-30px mb-30px border border-borderColor2 dark:border-borderColor2-dark"
      data-aos="fade-up"
    >
      <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-primaryColor before:absolute before:bottom-[5px] before:left-0 leading-30px mb-25px">
        Get in Touch
      </h4>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            placeholder="Enter Name*"
            value={formData.name}
            onChange={handleChange}
            className={`w-full text-contentColor leading-7 pb-10px bg-transparent focus:outline-none placeholder:text-placeholder placeholder:opacity-80 border-b ${
              errors.name 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-borderColor2 dark:border-borderColor2-dark'
            } dark:text-contentColor-dark`}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Enter your mail*"
            value={formData.email}
            onChange={handleChange}
            className={`w-full text-contentColor leading-7 pb-10px bg-transparent focus:outline-none placeholder:text-placeholder placeholder:opacity-80 border-b ${
              errors.email 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-borderColor2 dark:border-borderColor2-dark'
            } dark:text-contentColor-dark`}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>
        <div>
          <textarea
            name="message"
            placeholder="Message*"
            rows="4"
            value={formData.message}
            onChange={handleChange}
            className={`w-full text-contentColor leading-7 pb-10px bg-transparent focus:outline-none placeholder:text-placeholder placeholder:opacity-80 border-b resize-none ${
              errors.message 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-borderColor2 dark:border-borderColor2-dark'
            } dark:text-contentColor-dark`}
          />
          {errors.message && (
            <p className="text-red-500 text-xs mt-1">{errors.message}</p>
          )}
          {formData.message && !errors.message && (
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
              {formData.message.length}/5000 characters
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={submitInquiry.isPending}
          className="text-size-15 text-whiteColor uppercase bg-primaryColor border border-primaryColor px-55px py-13px hover:text-primaryColor hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-whiteColor disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitInquiry.isPending ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

export default BlogContactForm;
