"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import eventImage5 from "@/assets/images/event/event__5.png";
import eventDetails2 from "@/assets/images/icon/event__details__2.png";
import Link from "next/link";
import { format } from "date-fns";
import CheckoutButton from "@/components/shared/checkout/CheckoutButton.js";
import PaymentErrorBoundary from "@/components/shared/error-boundaries/PaymentErrorBoundary.js";
import { useAuthStore } from "@/store/index.js";
import apiClient from "@/lib/api/client.js";
import useSweetAlert from "@/hooks/useSweetAlert.js";

const EventDetails = ({ event }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const createAlert = useSweetAlert();

  // Check registration status
  useEffect(() => {
    if (!event?.id || !isAuthenticated) return;

    const checkRegistration = async () => {
      try {
        const response = await apiClient.get(`/events/${event.id}/register`);
        if (response.success) {
          setIsRegistered(response.isRegistered);
          setRegistrationStatus(response.registration);
        }
      } catch (error) {
        // Not registered or error - ignore
        console.error('Registration check error:', error);
      }
    };

    checkRegistration();
  }, [event?.id, isAuthenticated]);

  const handleFreeRegistration = async () => {
    if (!isAuthenticated) {
      createAlert('error', 'Please login to register for this event');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await apiClient.post(`/events/${event.id}/register`);
      if (response.success) {
        setIsRegistered(true);
        createAlert('success', 'Successfully registered for the event!');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      createAlert('error', error.message || 'Failed to register for event');
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // After payment, automatically register
    try {
      const response = await apiClient.post(`/events/${event.id}/register`);
      if (response.success) {
        setIsRegistered(true);
        createAlert('success', 'Payment successful! You are now registered for the event.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Auto-registration after payment error:', error);
      // Payment succeeded but registration failed - show message
      createAlert('warning', 'Payment successful, but registration failed. Please contact support.');
    }
  };

  if (!event) {
    return (
      <section>
        <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px">
          <div className="text-center">
            <p className="text-contentColor dark:text-contentColor-dark">Loading event...</p>
          </div>
        </div>
      </section>
    );
  }

  // Format dates
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const updatedAt = event.updated_at ? new Date(event.updated_at) : null;
  
  // Get creator name
  const creatorName = event.creator 
    ? `${event.creator.first_name || ''} ${event.creator.last_name || ''}`.trim() || event.creator.email || 'Unknown'
    : 'Unknown';

  // Get organization name or mode as category
  const category = event.organization?.name || (event.mode ? event.mode.charAt(0).toUpperCase() + event.mode.slice(1) : 'Event');

  // Format time range
  const timeRange = startDate && endDate
    ? `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
    : startDate
    ? format(startDate, 'h:mm a')
    : 'TBA';

  // Get venue/location based on mode
  const venue = event.mode === 'online' 
    ? 'Online Event' 
    : event.mode === 'offline' 
    ? (event.organization?.name || 'TBA')
    : 'Hybrid Event';

  return (
    <section>
      <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
          <div className="lg:col-start-1 lg:col-span-8 space-y-[35px]">
            {/* event heading  */}
            <div>
              <div className="flex items-center gap-10px mb-30px" data-aos="fade-up">
                <p className="text-sm text-whiteColor bg-indigo rounded leading-25px px-2 inline-block">
                  {category}
                </p>
                {!event.is_free && (
                  <span className="text-sm text-whiteColor bg-primaryColor rounded leading-25px px-2 inline-block">
                    Paid Event
                  </span>
                )}
              </div>
              <h3
                className="text-3xl md:text-size-40 leading-11 md:leading-13.5 text-blackColor dark:text-blackColor-dark mb-15px font-bold"
                data-aos="fade-up"
              >
                {event.title}
              </h3>
              <div className="flex flex-wrap items-center">
                {event.creator && (
                  <div
                    className="flex mr-26px md:mr-76px items-center"
                    data-aos="fade-up"
                  >
                    <div className="flex-shrink-0 w-66px h-66px">
                      <Image 
                        src={eventImage5} 
                        alt={creatorName} 
                        placeholder="blur"
                        className="rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-base md:text-size-11 lg:text-base font-medium text-blackColor dark:text-blackColor-dark leading-19px">
                        Creator:
                      </p>
                      <p className="text-sm md:text-xs lg:text-sm text-contentColor dark:text-contentColor-dark leading-4 mb-15px">
                        {creatorName}
                      </p>
                    </div>
                  </div>
                )}
                {updatedAt && (
                  <div className="mr-26px md:mr-76px" data-aos="fade-up">
                    <div>
                      <p className="text-base md:text-size-11 lg:text-base font-medium text-blackColor dark:text-blackColor-dark leading-19px">
                        Last Update:
                      </p>
                      <p className="text-sm md:text-xs lg:text-sm text-contentColor dark:text-contentColor-dark leading-4 mb-15px">
                        {format(updatedAt, 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
                <div className="mr-26px md:mr-76px" data-aos="fade-up">
                  <div>
                    <p className="text-base md:text-size-11 lg:text-base font-medium text-blackColor dark:text-blackColor-dark leading-19px">
                      Location:
                    </p>
                    <p className="text-sm md:text-xs lg:text-sm text-contentColor dark:text-contentColor-dark leading-4 mb-15px">
                      {venue}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* event content  */}
            <div data-aos="fade-up" className="mt-35px mb-30px">
              {/* event banner  */}
              {event.banner_url && (
                <div className="overflow-hidden relative mb-35px">
                  <Image
                    src={event.banner_url}
                    alt={event.title}
                    width={800}
                    height={400}
                    className="w-full h-auto"
                    unoptimized
                  />
                </div>
              )}
              {/* event content  */}
              <div>
                {event.description && (
                  <>
                    <h4
                      className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-15px !leading-30px"
                      data-aos="fade-up"
                    >
                      Description
                    </h4>
                    <div
                      className="text-darkdeep4 mb-15px !leading-29px prose dark:prose-invert max-w-none"
                      data-aos="fade-up"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          {/* event sidebar  */}
          <div className="lg:col-start-9 lg:col-span-4">
            {/* enroll section  */}
            <div
              className="py-33px px-25px shadow-event mb-30px"
              data-aos="fade-up"
            >
              <div className="flex justify-between mb-50px">
                <div className="text-size-21 font-bold text-primaryColor font-inter leading-25px">
                  {event.is_free ? (
                    <span>Free</span>
                  ) : (
                    <>
                      ₹{parseFloat(event.price || 0).toLocaleString('en-IN')}
                    </>
                  )}
                </div>
                {event.capacity && (
                  <div>
                    <span className="uppercase text-sm font-semibold text-secondaryColor2 leading-27px px-2 bg-whitegrey1 dark:bg-whitegrey1-dark">
                      {event.capacity} Seats
                    </span>
                  </div>
                )}
              </div>
              <ul>
                {endDate && (
                  <li className="flex items-center gap-x-10px mb-25px pb-22px border-b border-borderColor dark:border-borderColor-dark">
                    <div>
                      <svg
                        width="18"
                        height="19"
                        viewBox="0 0 18 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M17.0306 7.31951L10.2759 0.496974C9.92563 0.176359 9.46963 -0.000862647 8.997 3.15745e-06C8.52424 0.000848658 8.06889 0.179588 7.71964 0.50139L0.969643 7.3196C0.359786 7.98029 0.0142286 8.8461 0 9.74926V16.2142C0.00401786 16.8134 0.243082 17.3864 0.664972 17.8078C1.08685 18.2291 1.6569 18.4643 2.25 18.4616H15.75C16.3431 18.4643 16.9132 18.2291 17.335 17.8078C17.7569 17.3864 17.996 16.8133 18 16.2142V9.74926C17.9858 8.8461 17.6402 7.98029 17.0304 7.3196L17.0306 7.31951ZM7.50257 16.9464L7.51981 10.8858L10.8754 10.9054V16.9465L7.50257 16.9464ZM16.5004 16.2142C16.4967 16.4117 16.4159 16.5996 16.2753 16.7369C16.1346 16.874 15.946 16.9494 15.7504 16.9464H12.3754V10.9052C12.3749 10.4984 12.2147 10.1083 11.9299 9.82042C11.645 9.53278 11.2588 9.37094 10.856 9.37042H7.5198C7.11702 9.37092 6.7308 9.53276 6.44585 9.82042C6.16108 10.1082 6.00086 10.4983 6.00035 10.9052V16.9464H2.25035C2.05481 16.9494 1.86614 16.874 1.72552 16.7369C1.5849 16.5995 1.50403 16.4117 1.50035 16.2142V9.74922C1.51575 9.248 1.70309 8.76774 2.03071 8.39099L8.77642 1.57711H8.77626C8.84272 1.53044 8.92308 1.50829 9.00377 1.5142C9.08028 1.50828 9.15661 1.52892 9.22006 1.57271L15.9701 8.39092C16.2977 8.76768 16.4852 9.24794 16.5004 9.74915L16.5004 16.2142Z"
                          fill="#5F2DED"
                        ></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                        <span className="mr-7px text-blackColor dark:text-blackColor-dark">
                          End:
                        </span>
                        {format(endDate, 'MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </li>
                )}
                {startDate && (
                  <li className="flex items-center gap-x-10px mb-25px pb-22px border-b border-borderColor dark:border-borderColor-dark">
                    <div>
                      <svg
                        width="18"
                        height="19"
                        viewBox="0 0 18 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M17.0306 7.31951L10.2759 0.496974C9.92563 0.176359 9.46963 -0.000862647 8.997 3.15745e-06C8.52424 0.000848658 8.06889 0.179588 7.71964 0.50139L0.969643 7.3196C0.359786 7.98029 0.0142286 8.8461 0 9.74926V16.2142C0.00401786 16.8134 0.243082 17.3864 0.664972 17.8078C1.08685 18.2291 1.6569 18.4643 2.25 18.4616H15.75C16.3431 18.4643 16.9132 18.2291 17.335 17.8078C17.7569 17.3864 17.996 16.8133 18 16.2142V9.74926C17.9858 8.8461 17.6402 7.98029 17.0304 7.3196L17.0306 7.31951ZM7.50257 16.9464L7.51981 10.8858L10.8754 10.9054V16.9465L7.50257 16.9464ZM16.5004 16.2142C16.4967 16.4117 16.4159 16.5996 16.2753 16.7369C16.1346 16.874 15.946 16.9494 15.7504 16.9464H12.3754V10.9052C12.3749 10.4984 12.2147 10.1083 11.9299 9.82042C11.645 9.53278 11.2588 9.37094 10.856 9.37042H7.5198C7.11702 9.37092 6.7308 9.53276 6.44585 9.82042C6.16108 10.1082 6.00086 10.4983 6.00035 10.9052V16.9464H2.25035C2.05481 16.9494 1.86614 16.874 1.72552 16.7369C1.5849 16.5995 1.50403 16.4117 1.50035 16.2142V9.74922C1.51575 9.248 1.70309 8.76774 2.03071 8.39099L8.77642 1.57711H8.77626C8.84272 1.53044 8.92308 1.50829 9.00377 1.5142C9.08028 1.50828 9.15661 1.52892 9.22006 1.57271L15.9701 8.39092C16.2977 8.76768 16.4852 9.24794 16.5004 9.74915L16.5004 16.2142Z"
                          fill="#5F2DED"
                        ></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                        <span className="mr-7px text-blackColor dark:text-blackColor-dark">
                          Time:
                        </span>
                        {timeRange}
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex items-center gap-x-10px mb-25px pb-22px border-b border-borderColor dark:border-borderColor-dark">
                  <div>
                    <svg
                      width="18"
                      height="19"
                      viewBox="0 0 18 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17.0306 7.31951L10.2759 0.496974C9.92563 0.176359 9.46963 -0.000862647 8.997 3.15745e-06C8.52424 0.000848658 8.06889 0.179588 7.71964 0.50139L0.969643 7.3196C0.359786 7.98029 0.0142286 8.8461 0 9.74926V16.2142C0.00401786 16.8134 0.243082 17.3864 0.664972 17.8078C1.08685 18.2291 1.6569 18.4643 2.25 18.4616H15.75C16.3431 18.4643 16.9132 18.2291 17.335 17.8078C17.7569 17.3864 17.996 16.8133 18 16.2142V9.74926C17.9858 8.8461 17.6402 7.98029 17.0304 7.3196L17.0306 7.31951ZM7.50257 16.9464L7.51981 10.8858L10.8754 10.9054V16.9465L7.50257 16.9464ZM16.5004 16.2142C16.4967 16.4117 16.4159 16.5996 16.2753 16.7369C16.1346 16.874 15.946 16.9494 15.7504 16.9464H12.3754V10.9052C12.3749 10.4984 12.2147 10.1083 11.9299 9.82042C11.645 9.53278 11.2588 9.37094 10.856 9.37042H7.5198C7.11702 9.37092 6.7308 9.53276 6.44585 9.82042C6.16108 10.1082 6.00086 10.4983 6.00035 10.9052V16.9464H2.25035C2.05481 16.9494 1.86614 16.874 1.72552 16.7369C1.5849 16.5995 1.50403 16.4117 1.50035 16.2142V9.74922C1.51575 9.248 1.70309 8.76774 2.03071 8.39099L8.77642 1.57711H8.77626C8.84272 1.53044 8.92308 1.50829 9.00377 1.5142C9.08028 1.50828 9.15661 1.52892 9.22006 1.57271L15.9701 8.39092C16.2977 8.76768 16.4852 9.24794 16.5004 9.74915L16.5004 16.2142Z"
                        fill="#5F2DED"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                      <span className="mr-7px text-blackColor dark:text-blackColor-dark">
                        Venue:
                      </span>
                      {venue}
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-30px" data-aos="fade-up">
                <PaymentErrorBoundary>
                  {isRegistered ? (
                  <div className="space-y-10px">
                    <button
                      type="button"
                      disabled
                      className="text-size-15 text-whiteColor bg-greencolor px-14 py-10px border border-greencolor inline-block rounded cursor-not-allowed"
                    >
                      ✓ Already Registered
                    </button>
                    {registrationStatus?.payment_status === 'paid' && (
                      <p className="text-12px text-contentColor dark:text-contentColor-dark">
                        Payment Status: Paid
                      </p>
                    )}
                  </div>
                ) : event.external_link ? (
                  <a
                    href={event.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-size-15 text-whiteColor bg-primaryColor px-14 py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
                  >
                    Join Event
                  </a>
                ) : event.is_free ? (
                  <button
                    type="button"
                    onClick={handleFreeRegistration}
                    disabled={isRegistering || !isAuthenticated}
                    className="text-size-15 text-whiteColor bg-primaryColor px-14 py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegistering ? 'Registering...' : 'Register Now (Free)'}
                  </button>
                ) : (
                  <CheckoutButton
                    itemType="event"
                    itemId={event.id}
                    amount={parseFloat(event.price || 0)}
                    currency="INR"
                    onSuccess={handlePaymentSuccess}
                    className="text-size-15 text-whiteColor bg-primaryColor px-14 py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
                  >
                    Register Now - ₹{parseFloat(event.price || 0).toLocaleString('en-IN')}
                  </CheckoutButton>
                  )}
                </PaymentErrorBoundary>
              </div>
            </div>
            {/* organization/sponsor section  */}
            {(event.organization || event.creator) && (
              <div
                className="py-33px px-25px shadow-event mb-30px"
                data-aos="fade-up"
              >
                <h4 className="text-size-21 text-blackColor dark:text-blackColor-dark font-bold leading-25px">
                  {event.organization ? 'Organized By' : 'Created By'}
                </h4>
                {event.organization && (
                  <>
                    <div className="mt-25px mb-30px">
                      <Image src={eventDetails2} alt={event.organization.name} />
                    </div>
                    <p className="text-contentColor dark:text-contentColor-dark font-semibold leading-19px mb-15px">
                      {event.organization.name}
                    </p>
                  </>
                )}
                {event.creator && (
                  <p className="text-sm text-contentColor dark:text-contentColor-dark font-medium leading-[17px]">
                    <span className="text-blackColor dark:text-blackColor-dark">
                      Creator:
                    </span>
                    {creatorName}
                  </p>
                )}
                {event.creator?.email && (
                  <p className="text-sm text-contentColor dark:text-contentColor-dark font-medium leading-[17px] mt-2">
                    <span className="text-blackColor dark:text-blackColor-dark">
                      Email:
                    </span>
                    {event.creator.email}
                  </p>
                )}

                <div>
                  <ul className="flex gap-10px items-center mt-5">
                    <li>
                      <p className="text-xl font-semibold text-contentColor dark:text-contentColor-dark leading-6">
                        Share:
                      </p>
                    </li>
                    <li>
                      <Link
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-9 leading-9 text-center text-skycolor bg-whitegrey2 hover:text-whiteColor hover:bg-primaryColor dark:bg-whitegrey2-dark dark:text-skycolor dark:hover:text-whiteColor dark:hover:bg-primaryColor rounded"
                      >
                        <i className="icofont-facebook"></i>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-9 leading-9 text-center text-skycolor bg-whitegrey2 hover:text-whiteColor hover:bg-primaryColor dark:bg-whitegrey2-dark dark:text-skycolor dark:hover:text-whiteColor dark:hover:bg-primaryColor rounded"
                      >
                        <i className="icofont-twitter"></i>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`https://www.youtube.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-9 leading-9 text-center text-deepred bg-whitegrey2 hover:text-whiteColor hover:bg-primaryColor dark:bg-whitegrey2-dark dark:text-deepred dark:hover:text-whiteColor dark:hover:bg-primaryColor rounded"
                      >
                        <i className="icofont-youtube-play"></i>
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventDetails;
