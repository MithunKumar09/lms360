"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MfaForm from "@/components/shared/mfa/MfaForm";
import Image from "next/image";
import { useMfaSetup, useVerifyMfaSetup } from "@/hooks/api/useMfa";
import { useAuthStore } from "@/store/index.js";

const MfaSetup = ({ onSetupComplete, email: propEmail }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState("init"); // "init", "qr", "verify", "complete"
  const [qrScanned, setQrScanned] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);

  // Get email from props, URL params, or null
  const email = propEmail || searchParams.get("email") || null;

  // Use React Query hooks
  const { data: setupData, isLoading: setupLoading, error: setupError, refetch: refetchSetup } = useMfaSetup({
    enabled: step === "init" || step === "qr",
    email: email, // Pass email for email-based setup when no session available
  });

  const verifyMfaSetupMutation = useVerifyMfaSetup();

  // Initialize MFA setup when component mounts
  useEffect(() => {
    if (setupData) {
      if (setupData.mfaEnabled && setupData.mfaVerified) {
        // MFA is already set up and verified
        setStep("complete");
        return;
      }

      if (setupData.qrCode && setupData.secret) {
        setStep("qr");
        setQrScanned(false);
      }
    }
  }, [setupData]);

  // Handle setup error
  useEffect(() => {
    if (setupError) {
      console.error("MFA setup error:", setupError);
    }
  }, [setupError]);

  const handleVerify = async (code, isBackupCode) => {
    if (isBackupCode) {
      return; // Backup codes are not available during setup
    }

    // Use React Query mutation
    // Include email if available (for initial setup when no session exists)
    verifyMfaSetupMutation.mutate(
      { code, email: email || undefined },
      {
        onSuccess: (data) => {
          if (data.success && data.backupCodes) {
            // MFA setup complete
            setBackupCodes(data.backupCodes);
            setStep("complete");
            setQrScanned(true); // Hide QR code after verification
          }
        },
        onError: (error) => {
          console.error("MFA verification error:", error);
        },
      }
    );
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mfa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleContinue = () => {
    // After MFA setup is complete, redirect to dashboard
    // The session has been created by the API, so user is already logged in
    const getDashboardPath = (role) => {
      switch (role) {
        case 'superadmin':
          return '/dashboards/superadmin-dashboard';
        case 'admin':
          return '/dashboards/admin-dashboard';
        case 'instructor':
          return '/dashboards/instructor-dashboard';
        case 'student':
          return '/dashboards/student-dashboard';
        default:
          return '/dashboards/superadmin-dashboard';
      }
    };
    
    const dashboardPath = getDashboardPath(user?.role || 'superadmin');
    router.push(dashboardPath);
    
    if (onSetupComplete) {
      onSetupComplete();
    }
  };

  const loading = setupLoading || verifyMfaSetupMutation.isPending;
  const error = setupError?.message || verifyMfaSetupMutation.error?.message || null;
  const qrCode = setupData?.qrCode || "";
  const secret = setupData?.secret || "";
  const manualEntryKey = setupData?.manualEntryKey || setupData?.secret || "";
  const totpUri = setupData?.totpUri || "";

  if (step === "init" || (setupLoading && !setupData)) {
    return (
      <div className="opacity-100 transition-opacity duration-150 ease-linear">
        <div className="text-center">
          <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
            Setting up MFA...
          </h3>
          <p className="text-contentColor dark:text-contentColor-dark mb-15px">
            Please wait while we generate your MFA setup...
          </p>
          <div className="flex justify-center">
            <svg className="animate-spin h-8 w-8 text-primaryColor" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="opacity-100 transition-opacity duration-150 ease-linear">
        <div className="text-center">
          <div className="mb-25px">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-15px">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
              MFA Setup Complete!
            </h3>
            <p className="text-contentColor dark:text-contentColor-dark mb-15px">
              Your multi-factor authentication has been successfully set up.
            </p>
          </div>

          {backupCodes.length > 0 && (
            <div className="mb-25px p-20px bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <h4 className="text-lg font-bold text-blackColor dark:text-blackColor-dark mb-10px">
                ⚠️ Save Your Backup Codes
              </h4>
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-15px">
                These backup codes can be used to access your account if you lose access to your authenticator app. Save them in a secure location. They will not be shown again.
              </p>
              <div className="bg-whiteColor dark:bg-whiteColor-dark p-15px rounded border border-borderColor dark:border-borderColor-dark mb-15px">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10px text-center font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="p-10px bg-lightGrey10 dark:bg-lightGrey10-dark rounded">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleDownloadBackupCodes}
                className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
              >
                Download Backup Codes
              </button>
            </div>
          )}

          <div className="my-25px text-center">
            <button
              onClick={handleContinue}
              className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px w-full border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="opacity-100 transition-opacity duration-150 ease-linear">
      <div className="text-center">
        <h3 className="text-size-32 font-bold text-blackColor dark:text-blackColor-dark mb-2 leading-normal">
          Set Up Multi-Factor Authentication
        </h3>
        <p className="text-contentColor dark:text-contentColor-dark mb-15px">
          Scan the QR code with your authenticator app, or enter the code manually.
        </p>
      </div>

      {!qrScanned && qrCode && (
        <div className="mb-25px" data-aos="fade-up">
          <div className="text-center">
            <div className="inline-block p-20px bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded">
              <Image
                src={qrCode}
                alt="MFA QR Code"
                width={300}
                height={300}
                className="mx-auto"
                priority
              />
            </div>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mt-15px">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>
        </div>
      )}

      {!qrScanned && manualEntryKey && (
        <div className="mb-25px p-15px bg-lightGrey10 dark:bg-lightGrey10-dark rounded" data-aos="fade-up">
          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-10px font-bold">
            Can&apos;t scan? Enter this code manually:
          </p>
          <div className="p-10px bg-whiteColor dark:bg-whiteColor-dark rounded border border-borderColor dark:border-borderColor-dark">
            <code className="text-lg font-mono text-blackColor dark:text-blackColor-dark tracking-wider">
              {manualEntryKey}
            </code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(secret);
              alert("Secret copied to clipboard!");
            }}
            className="mt-10px text-sm text-primaryColor hover:text-primaryColor/80 underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}

      {qrScanned && (
        <div className="mb-25px p-15px bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ QR code scanned successfully. Please verify with a TOTP code.
          </p>
        </div>
      )}

      <MfaForm
        onSubmit={handleVerify}
        loading={loading}
        error={error}
        autoSubmit={true}
        placeholder="Enter 6-digit code from your app"
        showBackupCodeOption={false}
      />
    </div>
  );
};

export default MfaSetup;

