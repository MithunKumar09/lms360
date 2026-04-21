"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MfaForm from "@/components/shared/mfa/MfaForm";
import { useVerifyMfa } from "@/hooks/api/useMfa";

const MfaVerify = ({ email, redirect, onVerifyComplete }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyMfaMutation = useVerifyMfa();

  // Get redirect URL from props or URL params
  const redirectUrl = redirect || searchParams.get("redirect") || null;

  const handleVerify = async (code, isBackupCode) => {
    // Use React Query mutation
    verifyMfaMutation.mutate(
      {
        email: email,
        code: code,
        isBackupCode: isBackupCode,
      },
      {
        onSuccess: (data) => {
          console.log('🔐 [MFA VERIFY COMPONENT] onSuccess callback triggered');
          if (onVerifyComplete) {
            onVerifyComplete();
          }
          // Redirect is handled solely by useVerifyMfa.onSuccess in useMfa.js.
          // No redirect logic here — eliminates the window.location.href vs
          // router.push race that was sending users to the wrong dashboard.
        },
        onError: (error) => {
          console.error('🔐 [MFA VERIFY COMPONENT] ❌ Error in component callback:', error);
          // Note: No redirect on error - staying on page to see logs
        },
      }
    );
  };
  
  const loading = verifyMfaMutation.isPending;
  const error = verifyMfaMutation.error?.message || null;

  return (
    <div className="opacity-100 transition-opacity duration-150 ease-linear">
      <div className="text-center">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Multi-Factor Authentication
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-15px">
          Enter the code from your authenticator app to complete login.
        </p>
        {email && (
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-15px opacity-70">
            Verifying for: {email}
          </p>
        )}
      </div>

      <MfaForm
        onSubmit={handleVerify}
        loading={loading}
        error={error}
        autoSubmit={true}
        placeholder="Enter 6-digit code from your app"
        showBackupCodeOption={true}
      />

      <div className="mt-25px text-center">
        <p className="text-sm text-contentColor dark:text-contentColor-dark">
          Lost your device?{" "}
          <a
            href="#"
            className="text-primaryColor hover:text-primaryColor/80 underline"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Implement account recovery flow
              alert("Please contact support for account recovery.");
            }}
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
};

export default MfaVerify;

