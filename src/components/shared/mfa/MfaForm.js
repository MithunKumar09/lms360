"use client";

import { useState, useEffect, useRef } from "react";
import { totpCodeSchema, backupCodeSchema, safeParse } from "@/lib/validation/schemas.js";
import ErrorDisplay from "@/components/shared/errors/ErrorDisplay.js";

const MfaForm = ({
  onSubmit,
  onBackupCodeClick,
  loading = false,
  error = null,
  autoSubmit = true,
  placeholder = "Enter 6-digit code",
  showBackupCodeOption = true,
}) => {
  const [code, setCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-submit when 6 digits are entered (for TOTP)
  useEffect(() => {
    if (autoSubmit && !isBackupCode && code.length === 6 && /^\d{6}$/.test(code)) {
      handleSubmit();
    }
  }, [code, isBackupCode, autoSubmit]);

  const handleChange = (e) => {
    const value = e.target.value;
    
    if (isBackupCode) {
      // For backup codes, allow alphanumeric (8 characters)
      if (value.length <= 8) {
        setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
      }
    } else {
      // For TOTP codes, only allow digits (6 characters)
      if (value.length <= 6) {
        setCode(value.replace(/\D/g, ""));
      }
    }
  };

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }

    // Validate code using zod schema
    if (isBackupCode) {
      const result = safeParse(backupCodeSchema, code);
      if (!result.success) {
        // Validation error will be handled by parent component
        return;
      }
    } else {
      const result = safeParse(totpCodeSchema, code);
      if (!result.success) {
        // Validation error will be handled by parent component
        return;
      }
    }

    if (onSubmit) {
      onSubmit(code, isBackupCode);
    }
  };

  const handleBackupCodeClick = () => {
    setIsBackupCode(!isBackupCode);
    setCode("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
    if (onBackupCodeClick) {
      onBackupCodeClick(!isBackupCode);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pt-25px" data-aos="fade-up">
      <div className="mb-25px">
        <label className="text-contentColor dark:text-contentColor-dark mb-10px block">
          {isBackupCode ? "Backup Code" : "TOTP Code"}
        </label>
        <input
          ref={inputRef}
          type="text"
          placeholder={isBackupCode ? "Enter 8-character backup code" : placeholder}
          value={code}
          onChange={handleChange}
          maxLength={isBackupCode ? 8 : 6}
          className="w-full h-52px leading-52px pl-5 bg-transparent text-sm focus:outline-none text-contentColor dark:text-contentColor-dark border border-borderColor dark:border-borderColor-dark placeholder:text-placeholder placeholder:opacity-80 font-medium rounded text-center text-2xl tracking-widest"
          disabled={loading}
        />
        <p className="text-sm text-contentColor dark:text-contentColor-dark mt-10px opacity-70">
          {isBackupCode
            ? "Enter your 8-character backup code"
            : "Enter the 6-digit code from your authenticator app"}
        </p>
      </div>

      {error && (
        <ErrorDisplay
          error={error}
          type="inline"
          variant="error"
          className="mb-25px"
        />
      )}

      {showBackupCodeOption && (
        <div className="mb-25px text-center">
          <button
            type="button"
            onClick={handleBackupCodeClick}
            className="text-sm text-primaryColor hover:text-primaryColor/80 underline"
          >
            {isBackupCode ? "Use TOTP code instead" : "Use backup code instead"}
          </button>
        </div>
      )}

      <div className="my-25px text-center">
        <button
          type="submit"
          disabled={loading || (isBackupCode ? code.length !== 8 : code.length !== 6)}
          className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px w-full border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-whiteColor" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
          ) : (
            "Verify"
          )}
        </button>
      </div>
    </form>
  );
};

export default MfaForm;

