/**
 * Password reset email template
 */

import { DEFAULT_LOCALE } from '../send.js';

export function passwordResetTemplate({ resetUrl, expiryHours = 24, forced = false, locale = DEFAULT_LOCALE }) {
	const subject = forced
		? 'Password Reset Required'
		: 'Reset Your Password';
	
	const text = forced
		? `Your password has been reset by an administrator. You must set a new password to continue using your account.

This reset link will expire in ${expiryHours} hours.

Reset your password:
${resetUrl}

If you did not request this reset, please contact support immediately.
`
		: `You requested to reset your password. Click the link below to set a new password:

${resetUrl}

This link will expire in ${expiryHours} hours.

If you did not request a password reset, please ignore this email or contact support if you have concerns.
`;

	const html = forced
		? `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <h2>Password Reset Required</h2>
  <p>Your password has been reset by an administrator. You must set a new password to continue using your account.</p>
  <p>This reset link will expire in <strong>${expiryHours} hours</strong>.</p>
  <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none">Reset Password</a></p>
  <p>Or paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
  <p style="color:#dc2626;font-weight:600">⚠️ If you did not request this reset, please contact support immediately.</p>
</div>`
		: `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <h2>Reset Your Password</h2>
  <p>You requested to reset your password. Click the link below to set a new password:</p>
  <p>This link will expire in <strong>${expiryHours} hours</strong>.</p>
  <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#1a56db;color:#fff;border-radius:6px;text-decoration:none">Reset Password</a></p>
  <p>Or paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
  <p style="color:#6b7280;font-size:14px">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
</div>`;

	return { subject, text, html };
}

