/**
 * Paid Course Enrollment Modal
 * 
 * Displays payment details and enrollment confirmation for paid courses
 */

"use client";
import React, { useEffect, useRef, useState } from "react";
import { useEnrollCourse } from "@/hooks/api/useEnrollment";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import CheckoutButton from "@/components/shared/checkout/CheckoutButton";
import PaymentErrorBoundary from "@/components/shared/error-boundaries/PaymentErrorBoundary.js";
import CouponInput from "@/components/shared/checkout/CouponInput.js";

const PaidCourseEnrollmentModal = ({ isOpen, onClose, course }) => {
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const enrollMutation = useEnrollCourse();
  const queryClient = useQueryClient();
  const lastScrollTopRef = useRef(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (response, verifyData) => {
    if (!course?.id) {
      console.error('Course ID missing');
      onClose();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    // After payment success, verify payment first (for local dev where webhooks don't work)
    const courseId = course.id;
    
    // Razorpay response has snake_case fields
    const razorpayOrderId = response?.razorpay_order_id || verifyData?.order?.razorpayOrderId;
    const razorpayPaymentId = response?.razorpay_payment_id || response?.razorpayPaymentId;
    const razorpaySignature = response?.razorpay_signature || response?.razorpaySignature;

    console.log('💰 [PAYMENT SUCCESS] Payment response:', {
      response,
      verifyData,
      razorpayOrderId,
      razorpayPaymentId,
    });

    // Step 1: Verify payment and update order status (important for local dev)
    if (razorpayOrderId) {
      try {
        const verifyResponse = await fetch('/api/checkout/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
          }),
        });

        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
          console.log('✅ Payment verified and order updated:', verifyData);
        } else {
          console.warn('⚠️ Payment verification failed (webhook may handle it):', verifyData);
          // Continue anyway - webhook might handle it
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        // Continue anyway - webhook might handle it
      }
    }

    // Step 2: After payment verification, ensure enrollment is created
    let enrollmentCreated = false;
    const maxRetries = 6; // Try up to 6 times (total ~10 seconds)
    let retryCount = 0;
    let retryDelay = 500; // Start with 500ms

    // Try to enroll directly or wait for webhook to create enrollment
    while (retryCount < maxRetries && !enrollmentCreated) {
      try {
        // First attempt: Try to enroll directly (checks for paid order and enrolls)
        // If webhook already created enrollment, this will return "already enrolled"
        const enrollResponse = await fetch(`/api/courses/${courseId}/enroll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const enrollData = await enrollResponse.json();
        
        if (enrollData.success) {
          enrollmentCreated = true;
          console.log('✅ Enrollment created/verified after payment:', enrollData);
          break;
        }
      } catch (error) {
        console.error('Error enrolling after payment:', error);
      }

      // If enrollment not created yet, check if webhook created it
      if (!enrollmentCreated) {
        try {
          const checkResponse = await fetch(`/api/courses/${courseId}/enroll`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const checkData = await checkResponse.json();
          
          if (checkData.success && checkData.isEnrolled) {
            enrollmentCreated = true;
            console.log('✅ Enrollment found (created by webhook):', checkData);
            break;
          }
        } catch (error) {
          console.error('Error checking enrollment status:', error);
        }
      }

      // Wait before retrying (exponential backoff)
      if (!enrollmentCreated && retryCount < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay = Math.min(retryDelay * 1.5, 2000); // Max 2 seconds
      }

      retryCount++;
    }

    // Invalidate all enrollment and course-related queries using predicate-based invalidation
    // This ensures all queries are invalidated regardless of filters, pagination, or course IDs
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'courses' || 
               key === 'enrollment' || 
               key === 'enrollment-status' ||
               key === 'courseDetails';
      },
    });

    // Close modal and reload page to refresh UI
    onClose();
    
    // Small delay to ensure query invalidation completes
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 100);
  };

  // Handle payment error
  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    alert(error.message || 'Payment failed. Please try again.');
  };

  // Prevent body scroll when modal is open and handle navbar collapse on scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const stickyHeader = document.querySelector('.sticky-header');
      if (!stickyHeader) return;

      const handleScroll = (e) => {
        const currentScrollTop = e.target.scrollTop;
        const scrollDifference = currentScrollTop - lastScrollTopRef.current;
        
        // Only hide/show if scroll is significant (more than 5px)
        if (Math.abs(scrollDifference) > 5) {
          if (scrollDifference > 0) {
            // Scrolling down - hide navbar
            stickyHeader.style.transform = 'translateY(-100%)';
            stickyHeader.style.transition = 'transform 0.3s ease-in-out';
          } else {
            // Scrolling up - show navbar
            stickyHeader.style.transform = 'translateY(0)';
            stickyHeader.style.transition = 'transform 0.3s ease-in-out';
          }
          lastScrollTopRef.current = currentScrollTop;
        }
      };

      const contentElement = contentRef.current;
      if (contentElement) {
        lastScrollTopRef.current = contentElement.scrollTop;
        contentElement.addEventListener('scroll', handleScroll);
        
        return () => {
          contentElement.removeEventListener('scroll', handleScroll);
          // Reset navbar position when modal closes
          if (stickyHeader) {
            stickyHeader.style.transform = '';
            stickyHeader.style.transition = '';
          }
        };
      }
    } else {
      document.body.style.overflow = 'unset';
      // Reset navbar position when modal closes
      const stickyHeader = document.querySelector('.sticky-header');
      if (stickyHeader) {
        stickyHeader.style.transform = '';
        stickyHeader.style.transition = '';
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !course) return null;

  const courseImage = course.thumbnailUrl || course.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ECourse Image%3C/text%3E%3C/svg%3E";
  
  // Calculate price - ensure all values are numbers
  const regularPrice = parseFloat(course.regularPrice || course.regular_price || 0) || 0;
  const discountedPrice = course.discountedPrice || course.discounted_price;
  const parsedDiscountedPrice = discountedPrice != null ? parseFloat(discountedPrice) || 0 : null;
  const basePrice = parsedDiscountedPrice && parsedDiscountedPrice > 0 ? parsedDiscountedPrice : regularPrice;
  const hasDiscount = parsedDiscountedPrice && parsedDiscountedPrice > 0 && parsedDiscountedPrice < regularPrice;
  const courseDiscountAmount = hasDiscount ? regularPrice - parsedDiscountedPrice : 0;
  const discountPercentage = hasDiscount ? Math.round((courseDiscountAmount / regularPrice) * 100) : 0;

  // Calculate final amount with coupon and tax
  const amountAfterCoupon = basePrice - discountAmount;
  const calculatedTax = taxAmount || 0; // Tax will be calculated by backend
  const calculatedFinalAmount = finalAmount || (amountAfterCoupon + calculatedTax);

  const handleCouponApply = (coupon, discount, amountAfterDiscount) => {
    setAppliedCoupon({ ...coupon, discountAmount: discount });
    setDiscountAmount(discount);
    // Tax and final amount will be recalculated by backend
    setFinalAmount(amountAfterDiscount);
  };

  const handleCouponRemove = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setFinalAmount(basePrice);
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paid-enrollment-modal-title"
    >
      <div
        ref={contentRef}
        className="relative z-10 w-full max-w-lg bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-70 hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-lightGrey5 dark:hover:bg-darkdeep1"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            className="w-5 h-5 fill-current"
          >
            <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"></path>
          </svg>
        </button>

        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-primaryColor to-primaryColor/90 dark:from-primaryColor dark:to-primaryColor/80 px-6 py-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-whiteColor rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-whiteColor rounded-full translate-x-1/2 translate-y-1/2"></div>
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-3 bg-whiteColor/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="icofont-shopping-cart text-4xl text-whiteColor"></i>
            </div>
            <h2
              id="paid-enrollment-modal-title"
              className="text-2xl font-bold text-whiteColor mb-1"
            >
              Enroll in Course
            </h2>
            <p className="text-whiteColor/90 text-sm">
              Complete your purchase to start learning
            </p>
          </div>
        </div>

        {/* Course Details */}
        <div className="p-6">
          {/* Course Image and Title */}
          <div className="mb-6">
            <div className="relative w-full h-40 rounded-lg overflow-hidden mb-4 bg-lightGrey5 dark:bg-darkdeep1">
              <Image
                src={courseImage}
                alt={course.title || "Course"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 500px"
              />
            </div>
            <h3 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              {course.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-contentColor dark:text-contentColor-dark">
              {course.formattedLessonCount || course.lesson ? (
                <div className="flex items-center gap-1">
                  <i className="icofont-book-alt text-primaryColor"></i>
                  <span>{course.formattedLessonCount || course.lesson}</span>
                </div>
              ) : null}
              {course.formattedDuration || course.duration ? (
                <div className="flex items-center gap-1">
                  <i className="icofont-clock-time text-primaryColor"></i>
                  <span>{course.formattedDuration || course.duration}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Coupon Input */}
          <div className="mb-6">
            <CouponInput
              onApply={handleCouponApply}
              onRemove={handleCouponRemove}
              appliedCoupon={appliedCoupon}
              itemType="course"
              itemId={course.id}
              orderAmount={basePrice}
            />
          </div>

          {/* Payment Details */}
          <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-5 mb-6">
            <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-4 flex items-center gap-2">
              <i className="icofont-credit-card text-primaryColor"></i>
              Payment Details
            </h4>
            
            <div className="space-y-3">
              {/* Regular Price */}
              <div className="flex justify-between items-center">
                <span className="text-contentColor dark:text-contentColor-dark">Course Price:</span>
                {hasDiscount ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-contentColor dark:text-contentColor-dark line-through">
                      ₹{regularPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-lg font-bold text-primaryColor">
                      ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-primaryColor">
                    ₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {/* Course Discount */}
              {hasDiscount && (
                <div className="flex justify-between items-center bg-greencolor/10 dark:bg-greencolor/20 rounded p-2">
                  <span className="text-sm text-greencolor font-medium">
                    <i className="icofont-tag"></i> Course Discount ({discountPercentage}% off):
                  </span>
                  <span className="text-sm font-bold text-greencolor">
                    -₹{courseDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Coupon Discount */}
              {discountAmount > 0 && (
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    <i className="icofont-ticket"></i> Coupon Discount ({appliedCoupon?.code}):
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Tax */}
              {calculatedTax > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-contentColor dark:text-contentColor-dark">Tax (GST):</span>
                  <span className="text-contentColor dark:text-contentColor-dark">
                    ₹{calculatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-borderColor dark:border-borderColor-dark pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blackColor dark:text-blackColor-dark">Total:</span>
                  <span className="text-2xl font-bold text-primaryColor">
                    ₹{calculatedFinalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Benefits */}
          <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-3 flex items-center gap-2">
              <i className="icofont-star text-primaryColor"></i>
              What&apos;s included:
            </h4>
            <ul className="space-y-2 text-sm text-contentColor dark:text-contentColor-dark">
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Full access to all course materials</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Lifetime access to course content</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Certificate upon completion</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Learn at your own pace</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>24/7 support access</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-lightGrey5 dark:bg-darkdeep1 rounded-lg hover:bg-lightGrey6 dark:hover:bg-darkdeep2 transition-colors"
            >
              Cancel
            </button>
            <PaymentErrorBoundary>
              <CheckoutButton
                itemType="course"
                itemId={course.id}
                amount={calculatedFinalAmount}
                currency="INR"
                couponCode={appliedCoupon?.code || null}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                className="flex-1 px-4 py-3 text-sm font-semibold text-whiteColor bg-primaryColor rounded-lg hover:bg-primaryColor/90 transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <i className="icofont-shopping-cart"></i>
                Pay Now
              </CheckoutButton>
            </PaymentErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaidCourseEnrollmentModal;

