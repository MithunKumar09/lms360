import { NextResponse } from "next/server";
import { issueEmailOtp, verifyEmailOtp } from "@/lib/security/mfa.js";
import { sendEmail } from "@/lib/email/send.js";
import { mfaEmailOtpTemplate } from "@/lib/email/templates/mfaEmailOtp.js";

// POST: send OTP to email (masked externally). Body: { email }
export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email;
    
    // Validate email - check for null, undefined, or empty string
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json({ 
        error: "INVALID_EMAIL", 
        message: "Email is required and must be a valid string" 
      }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ 
        error: "INVALID_EMAIL_FORMAT", 
        message: "Please provide a valid email address" 
      }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const key = `invite:${trimmedEmail}`;
    
    try {
      const code = await issueEmailOtp({ key });
      const { subject, text, html } = mfaEmailOtpTemplate({ code, ttlMinutes: 5 });
      await sendEmail({ to: trimmedEmail, subject, text, html, category: "mfa_otp" });
      return NextResponse.json({ ok: true, message: "OTP code sent successfully" });
    } catch (otpError) {
      console.error('[INVITE_OTP] Error sending OTP:', otpError);
      return NextResponse.json({ 
        error: "OTP_SEND_FAILED", 
        message: otpError.message || "Failed to send OTP code. Please try again." 
      }, { status: 500 });
    }
  } catch (e) {
    console.error('[INVITE_OTP] Unexpected error:', e);
    return NextResponse.json({ 
      error: "SERVER_ERROR", 
      message: e.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

// PUT: verify OTP. Body: { email, code }
export async function PUT(request) {
  try {
    const body = await request.json();
    const email = body?.email;
    const code = body?.code;
    
    // Validate email
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json({ 
        error: "INVALID_EMAIL", 
        message: "Email is required" 
      }, { status: 400 });
    }

    // Validate code
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ 
        error: "INVALID_CODE", 
        message: "OTP code is required" 
      }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    
    try {
      const res = await verifyEmailOtp({ key: `invite:${trimmedEmail}`, code: trimmedCode });
      if (!res.ok) {
        return NextResponse.json({ 
          error: res.reason || "INVALID_CODE", 
          message: res.reason === 'EXPIRED' 
            ? "OTP code has expired. Please request a new one." 
            : "Invalid or expired OTP code. Please try again." 
        }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: "OTP verified successfully" });
    } catch (verifyError) {
      console.error('[INVITE_OTP] Error verifying OTP:', verifyError);
      return NextResponse.json({ 
        error: "VERIFICATION_FAILED", 
        message: verifyError.message || "Failed to verify OTP code. Please try again." 
      }, { status: 500 });
    }
  } catch (e) {
    console.error('[INVITE_OTP] Unexpected error:', e);
    return NextResponse.json({ 
      error: "SERVER_ERROR", 
      message: e.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}


