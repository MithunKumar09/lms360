"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api/client.js";
import Image from "next/image";
import { format } from "date-fns";
import Link from "next/link";
import CheckoutButton from "@/components/shared/checkout/CheckoutButton.js";
import PaymentErrorBoundary from "@/components/shared/error-boundaries/PaymentErrorBoundary.js";
import { useAuthStore } from "@/store/index.js";
import { useState, useEffect } from "react";
import useSweetAlert from "@/hooks/useSweetAlert.js";

export default function WorkshopDetailsPage() {
  const params = useParams();
  const workshopId = params.id;
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const createAlert = useSweetAlert();

  const { data: workshopData, isLoading } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: async () => {
      const response = await apiClient.get(`/workshops/${workshopId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workshop');
      }
      return response.data;
    },
    enabled: !!workshopId,
  });

  const workshop = workshopData?.workshop;

  // Check registration status
  useEffect(() => {
    if (!workshopId || !isAuthenticated) return;

    const checkRegistration = async () => {
      try {
        const response = await apiClient.get(`/workshops/${workshopId}/register`);
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
  }, [workshopId, isAuthenticated]);

  const handleFreeRegistration = async () => {
    if (!isAuthenticated) {
      createAlert('error', 'Please login to register for this workshop');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await apiClient.post(`/workshops/${workshopId}/register`);
      if (response.success) {
        setIsRegistered(true);
        createAlert('success', 'Successfully registered for the workshop!');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      createAlert('error', error.message || 'Failed to register for workshop');
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // After payment, automatically register
    try {
      const response = await apiClient.post(`/workshops/${workshopId}/register`);
      if (response.success) {
        setIsRegistered(true);
        createAlert('success', 'Payment successful! You are now registered for the workshop.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Auto-registration after payment error:', error);
      // Payment succeeded but registration failed - show message
      createAlert('warning', 'Payment successful, but registration failed. Please contact support.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-contentColor dark:text-contentColor-dark">Loading workshop...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-contentColor dark:text-contentColor-dark">Workshop not found</p>
            <Link href="/workshops" className="text-primaryColor hover:underline mt-4 inline-block">
              Back to Workshops
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isUpcoming = new Date(workshop.start_date) > new Date();
  const isCurrent = new Date(workshop.start_date) <= new Date() && new Date(workshop.end_date) >= new Date();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/workshops" className="text-primaryColor hover:underline mb-4 inline-block">
          ← Back to Workshops
        </Link>

        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark">
          {workshop.banner_url && (
            <div className="relative w-full h-64 md:h-96 overflow-hidden">
              <Image
                src={workshop.banner_url}
                alt={workshop.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-blackColor dark:text-whiteColor mb-2">
                  {workshop.title}
                </h1>
                {!workshop.is_free && (
                  <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-primaryColor text-whiteColor">
                    Paid Workshop
                  </span>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {isUpcoming && (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Upcoming
                  </span>
                )}
                {isCurrent && (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Live Now
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm text-contentColor dark:text-contentColor-dark">
              <div>
                <strong>Start Date:</strong> {format(new Date(workshop.start_date), 'PPP p')}
              </div>
              <div>
                <strong>End Date:</strong> {format(new Date(workshop.end_date), 'PPP p')}
              </div>
              <div>
                <strong>Mode:</strong> {workshop.mode === 'online' ? 'Online' : workshop.mode === 'offline' ? 'Offline' : 'Hybrid'}
              </div>
              {workshop.capacity && (
                <div>
                  <strong>Capacity:</strong> {workshop.capacity} attendees
                </div>
              )}
              {workshop.is_free ? (
                <div className="text-green-600 dark:text-green-400 font-semibold">
                  <strong>Price:</strong> Free Workshop
                </div>
              ) : (
                <div>
                  <strong>Price:</strong> ₹{parseFloat(workshop.price || 0).toLocaleString('en-IN')}
                </div>
              )}
            </div>

            {workshop.description && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-3">Description</h2>
                <div 
                  className="text-contentColor dark:text-contentColor-dark prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: workshop.description }}
                />
              </div>
            )}

            <div className="mb-6">
              <PaymentErrorBoundary>
                {isRegistered ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="inline-block px-6 py-3 text-white bg-green-600 rounded-md cursor-not-allowed font-semibold"
                  >
                    ✓ Already Registered
                  </button>
                  {registrationStatus?.payment_status === 'paid' && (
                    <p className="text-sm text-contentColor dark:text-contentColor-dark">
                      Payment Status: Paid
                    </p>
                  )}
                </div>
              ) : workshop.external_link ? (
                <a
                  href={workshop.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors font-semibold"
                >
                  Join Workshop
                </a>
              ) : workshop.is_free ? (
                <button
                  type="button"
                  onClick={handleFreeRegistration}
                  disabled={isRegistering || !isAuthenticated}
                  className="inline-block px-6 py-3 text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering ? 'Registering...' : 'Register Now (Free)'}
                </button>
              ) : (
                <CheckoutButton
                  itemType="workshop"
                  itemId={workshop.id}
                  amount={parseFloat(workshop.price || 0)}
                  currency="INR"
                  onSuccess={handlePaymentSuccess}
                  className="inline-block px-6 py-3 text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors font-semibold"
                >
                  Register Now - ₹{parseFloat(workshop.price || 0).toLocaleString('en-IN')}
                </CheckoutButton>
                )}
              </PaymentErrorBoundary>
            </div>

            {workshop.organization && (
              <div className="pt-6 border-t-2 border-borderColor dark:border-borderColor-dark">
                <p className="text-sm text-contentColor dark:text-contentColor-dark">
                  <strong>Organized by:</strong> {workshop.organization.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

