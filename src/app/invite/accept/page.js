"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiMail, FiLock, FiShield, FiUser, FiBriefcase, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff, FiSend } from "react-icons/fi";

export default function InviteAcceptPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [state, setState] = useState({
    loading: true,
    error: "",
    invite: null,
  });
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/invite/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || "Invalid invite");
        if (active) setState({ loading: false, error: "", invite: data });
      } catch (e) {
        if (active) setState({ loading: false, error: e.message, invite: null });
      }
    })();
    return () => { active = false; };
  }, [token]);

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: [] });
      return;
    }

    let score = 0;
    const feedback = [];

    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push("At least 12 characters recommended");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("Add uppercase letters");

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("Add lowercase letters");

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push("Add numbers");

    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;
    else feedback.push("Add special characters");

    setPasswordStrength({ score, feedback: feedback.length > 0 ? feedback : ["Password is strong"] });
  }, [password]);

  async function sendOtp(emailMasked) {
    setSendingOtp(true);
    try {
      const email = window.prompt(`Enter your email to receive OTP (${emailMasked})`) || "";
      if (!email || email.trim().length === 0) {
        setSendingOtp(false);
        return;
      }
      const res = await fetch("/api/invite/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        alert(data.message || "OTP code sent to your email!");
      } else {
        alert(data.message || data.error || "Failed to send OTP. Please try again.");
      }
    } catch (e) {
      alert("Failed to send OTP: " + (e.message || "Network error. Please try again."));
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp(emailMasked) {
    const email = window.prompt(`Enter your email again (${emailMasked})`) || "";
    if (!email || email.trim().length === 0) {
      return false;
    }
    if (!otp || otp.trim().length === 0) {
      alert("Please enter the OTP code");
      return false;
    }
    try {
      const res = await fetch("/api/invite/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || data.error || "Invalid or expired OTP code. Please try again.");
        return false;
      }
      return true;
    } catch (e) {
      alert("Failed to verify OTP: " + (e.message || "Network error. Please try again."));
      return false;
    }
  }

  async function accept() {
    if (!password) {
      alert("Enter a strong password");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }
    
    setAccepting(true);
    try {
      // If email_otp, verify before accept
      if (state.invite?.mfa_required && state.invite?.mfa_method === "email_otp") {
        const ok = await verifyOtp(state.invite.emailMasked);
        if (!ok) {
          setAccepting(false);
          return;
        }
      }
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Handle specific error cases
        if (res.status === 409 && data.error === "USER_EXISTS") {
          alert(data.message || "A user with this email already exists. Please login instead.");
          router.push("/login");
        } else {
          alert(data.message || data.error || "Failed to accept invite. Please try again.");
        }
        setAccepting(false);
        return;
      }
      alert(data.message || "Invitation accepted successfully! Redirecting to login...");
      router.push("/login?invite=accepted");
    } catch (e) {
      alert("Failed to accept invitation: " + e.message);
      setAccepting(false);
    }
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkdeep1 p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primaryColor border-t-transparent mb-4"></div>
          <p className="text-contentColor dark:text-contentColor-dark text-lg font-medium">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkdeep1 p-4">
        <div className="max-w-md w-full bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <FiAlertCircle className="mx-auto text-5xl text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">Invalid Invitation</h1>
          <p className="text-contentColor dark:text-contentColor-dark mb-6">{state.error}</p>
          <button
            onClick={() => router.push("/login")}
            className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const inv = state.invite;
  const getStrengthColor = (score) => {
    if (score >= 4) return "bg-green-500";
    if (score >= 2) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkdeep1 p-4 py-12">
      <div className="max-w-lg w-full">
        {/* Header Card */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-lg p-6 mb-6 border border-borderColor dark:border-borderColor-dark">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primaryColor/10 dark:bg-primaryColor/20 rounded-full mb-4">
              <FiMail className="text-3xl text-primaryColor" />
            </div>
            <h1 className="text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
              Accept Invitation
            </h1>
            <p className="text-contentColor dark:text-contentColor-dark">
              Complete your account setup to get started
            </p>
          </div>

          {/* Invitation Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-borderColor dark:border-borderColor-dark">
              <FiMail className="text-primaryColor text-xl flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-70 mb-1">Email</p>
                <p className="text-sm font-medium text-blackColor dark:text-blackColor-dark">{inv.emailMasked}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-borderColor dark:border-borderColor-dark">
              <FiUser className="text-primaryColor text-xl flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-70 mb-1">Role</p>
                <p className="text-sm font-medium text-blackColor dark:text-blackColor-dark capitalize">{inv.role}</p>
              </div>
            </div>

            {(inv.orgName || (inv.organizations && inv.organizations.length > 0)) && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-borderColor dark:border-borderColor-dark">
                <FiBriefcase className="text-primaryColor text-xl flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-70 mb-1">
                    {inv.role === 'vendor' && inv.organizations && inv.organizations.length > 1 ? 'Organizations' : 'Organization'}
                  </p>
                  {inv.role === 'vendor' && inv.organizations && inv.organizations.length > 0 ? (
                    <div className="space-y-1">
                      {inv.organizations.map((org, idx) => (
                        <p key={org.id || idx} className="text-sm font-medium text-blackColor dark:text-blackColor-dark">
                          {org.name}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-blackColor dark:text-blackColor-dark">
                      {inv.orgName || (inv.organizations && inv.organizations[0]?.name)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-lg p-6 md:p-8 border border-borderColor dark:border-borderColor-dark">
          <form onSubmit={(e) => { e.preventDefault(); accept(); }}>
            {/* Password Field */}
            <div className="mb-6">
              <label className="text-contentColor dark:text-contentColor-dark mb-10px block font-medium flex items-center gap-2">
                <FiLock className="text-primaryColor" />
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full h-52px leading-52px pl-12 pr-12 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded transition-all focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={accepting}
                />
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark opacity-50" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark opacity-50 hover:opacity-100 transition-opacity"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-contentColor dark:text-contentColor-dark font-medium">
                      {passwordStrength.score}/5
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-xs text-contentColor dark:text-contentColor-dark opacity-70 space-y-1">
                      {passwordStrength.feedback.map((msg, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className={passwordStrength.score >= 4 ? "text-green-500" : "text-yellow-500"}>
                            {passwordStrength.score >= 4 ? <FiCheckCircle /> : "•"}
                          </span>
                          {msg}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* TOTP Info */}
            {inv.mfa_required && inv.mfa_method === "totp" && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <FiShield className="text-blue-600 dark:text-blue-400 text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">TOTP Authentication</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Two-factor authentication will be set up after your first login.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email OTP Field */}
            {inv.mfa_required && inv.mfa_method === "email_otp" && (
              <div className="mb-6">
                <label className="text-contentColor dark:text-contentColor-dark mb-10px block font-medium flex items-center gap-2">
                  <FiShield className="text-primaryColor" />
                  Email OTP Verification
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="w-full h-52px leading-52px pl-12 pr-4 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded transition-all focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 text-center text-2xl tracking-widest"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      disabled={accepting || sendingOtp}
                    />
                    <FiShield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark opacity-50" />
                  </div>
                  <button
                    type="button"
                    onClick={() => sendOtp(inv.emailMasked)}
                    disabled={sendingOtp || accepting}
                    className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-flex items-center gap-2 rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sendingOtp ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-whiteColor border-t-transparent"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend />
                        {otpSent ? "Resend" : "Send Code"}
                      </>
                    )}
                  </button>
                </div>
                {otpSent && (
                  <p className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <FiCheckCircle />
                    OTP code sent to your email
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={accepting || !password || password.length < 8}
              className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px w-full border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-flex items-center justify-center gap-2 rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-whiteColor border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FiCheckCircle />
                  Accept Invitation
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-contentColor dark:text-contentColor-dark hover:text-primaryColor transition-colors"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}


