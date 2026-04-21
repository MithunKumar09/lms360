/**
 * Checkout Button Component
 * 
 * Integrates Razorpay Checkout.js for payment processing
 */

"use client";
import { useState, useEffect } from "react";
import Script from "next/script";
import PaymentLoadingState from "@/components/shared/loading/PaymentLoadingState.js";

const CheckoutButton = ({ 
  itemType, 
  itemId, 
  amount, 
  currency = "INR",
  couponCode = null,
  onSuccess,
  onError,
  className = "",
  disabled = false,
  children
}) => {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentV2Enabled, setPaymentV2Enabled] = useState(false);

  // Check if payment v2 is enabled
  useEffect(() => {
    // Check feature flag from environment
    // Note: NEXT_PUBLIC_RAZORPAY_KEY_ID should be set in .env.local for client-side access
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    setPaymentV2Enabled(!!keyId);
  }, []);

  const handleCheckout = async () => {
    if (disabled || loading || !paymentV2Enabled) {
      return;
    }

    setLoading(true);

    try {
      // Create order via API
      const response = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType,
          itemId,
          amount,
          currency,
          couponCode,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      const { order } = data;

      // Get Razorpay key (from order response or env)
      const razorpayKey = order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      
      if (!razorpayKey) {
        throw new Error('Razorpay key not configured');
      }

      // Initialize Razorpay Checkout
      const options = {
        key: razorpayKey,
        amount: Math.round(order.amount * 100), // Convert to paise
        currency: order.currency,
        name: "Edurock LMS",
        description: `Payment for ${itemType}`,
        order_id: order.razorpayOrderId,
        handler: async function (response) {
          try {
            // Verify payment on server (with retry for webhook delay)
            let verifyData = null;
            let retries = 3;
            let retryDelay = 1000; // Start with 1 second

            while (retries > 0) {
              const verifyResponse = await fetch(
                `/api/checkout/order/${order.id}/status`
              );
              verifyData = await verifyResponse.json();

              // Check if payment is captured (handles webhook delay)
              if (verifyData.success && (verifyData.isCaptured || verifyData.isPaid || verifyData.payment?.status === "captured")) {
                break; // Payment verified, exit retry loop
              }

              // If not captured yet and webhook might be delayed, retry
              if (retries > 1 && verifyData.success && verifyData.order?.razorpayOrderId) {
                console.log(`Payment not yet in DB, retrying in ${retryDelay}ms... (${retries - 1} retries left)`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryDelay *= 2; // Exponential backoff
                retries--;
                continue;
              }

              // If we've exhausted retries or no order ID, fail
              throw new Error("Payment verification failed");
            }

            if (verifyData.success && (verifyData.isCaptured || verifyData.isPaid || verifyData.payment?.status === "captured")) {
              if (onSuccess) {
                onSuccess(response, verifyData);
              } else {
                // Default success handling
                window.location.reload();
              }
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            if (onError) {
              onError(error);
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          // You can prefill user details if available
        },
        notes: {
          itemType,
          itemId,
        },
        theme: {
          color: "#4F46E5", // Primary color
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      // Add error handler for Razorpay initialization errors
      const razorpay = new window.Razorpay(options);
      
      // Handle Razorpay payment failures
      razorpay.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response);
        setLoading(false);
        if (onError) {
          onError(new Error(response.error?.description || 'Payment failed'));
        } else {
          alert(response.error?.description || 'Payment failed. Please try again.');
        }
      });

      razorpay.open();
    } catch (error) {
      console.error("Checkout error:", error);
      setLoading(false);
      if (onError) {
        onError(error);
      } else {
        alert(error.message || "Failed to initiate checkout. Please try again.");
      }
    }
  };

  // If payment v2 is not enabled, show disabled state
  if (!paymentV2Enabled) {
    return (
      <button
        type="button"
        disabled
        className={`px-4 py-2 text-sm font-semibold text-white bg-gray-400 rounded-md cursor-not-allowed ${className}`}
      >
        Checkout (Coming Soon)
      </button>
    );
  }

  // Show loading state
  if (loading) {
    return <PaymentLoadingState message="Preparing checkout..." />;
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        onError={() => {
          console.error("Failed to load Razorpay checkout script");
          setRazorpayLoaded(false);
        }}
      />
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || loading || !razorpayLoaded}
        className={`px-4 py-2 text-sm font-semibold text-white bg-primaryColor hover:bg-primaryColor-dark rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Processing...
          </span>
        ) : (
          children || "Pay Now"
        )}
      </button>
    </>
  );
};

export default CheckoutButton;

