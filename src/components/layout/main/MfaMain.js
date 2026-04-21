"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";
import MfaSetup from "@/components/sections/mfa/MfaSetup";
import MfaVerify from "@/components/sections/mfa/MfaVerify";

const MfaMainContent = () => {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState("setup"); // "setup" or "verify"
  const [email, setEmail] = useState("");
  const [redirect, setRedirect] = useState("");

  useEffect(() => {
    // Check URL params for mode, email, and redirect
    const urlMode = searchParams.get("mode");
    const urlEmail = searchParams.get("email");
    const urlRedirect = searchParams.get("redirect");

    if (urlMode === "verify" && urlEmail) {
      setMode("verify");
      setEmail(urlEmail);
      if (urlRedirect) {
        setRedirect(urlRedirect);
      }
    } else {
      setMode("setup");
    }
  }, [searchParams]);

  return (
    <>
      <HeroPrimary path={mode === "setup" ? "MFA Setup" : "MFA Verification"} title={mode === "setup" ? "Multi-Factor Authentication Setup" : "Multi-Factor Authentication"} />
      <section className="relative">
        <div className="container py-100px">
          <div className="md:w-2/3 mx-auto">
            <div className="shadow-container bg-whiteColor dark:bg-whiteColor-dark pt-10px px-5 pb-10 md:p-50px md:pt-30px rounded-5px">
                    {mode === "setup" ? (
                      <Suspense fallback={
                        <div className="text-center">
                          <div className="flex justify-center">
                            <svg className="animate-spin h-8 w-8 text-primaryColor" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        </div>
                      }>
                        <MfaSetup onSetupComplete={() => setMode("verify")} email={email} />
                      </Suspense>
                    ) : (
                      <MfaVerify email={email} redirect={redirect} onVerifyComplete={() => {}} />
                    )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const MfaMain = () => {
  return (
    <Suspense fallback={
      <div className="container py-100px">
        <div className="md:w-2/3 mx-auto">
          <div className="shadow-container bg-whiteColor dark:bg-whiteColor-dark pt-10px px-5 pb-10 md:p-50px md:pt-30px rounded-5px">
            <div className="text-center">
              <div className="flex justify-center">
                <svg className="animate-spin h-8 w-8 text-primaryColor" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <MfaMainContent />
    </Suspense>
  );
};

export default MfaMain;

