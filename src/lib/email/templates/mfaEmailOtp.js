/**
 * MFA email OTP template (6-digit)
 */

import { DEFAULT_LOCALE } from '../send.js';

export function mfaEmailOtpTemplate({ code, ttlMinutes = 5, locale = DEFAULT_LOCALE }) {
	const subject = locale === 'en'
		? `Your verification code`
		: `Your verification code`;
	const text = `Your verification code is: ${code}

It expires in ${ttlMinutes} minutes. Do not share this code with anyone.`;
	const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <h2>Your verification code</h2>
  <p><strong>${code}</strong></p>
  <p>This code expires in <strong>${ttlMinutes} minutes</strong>. Do not share it with anyone.</p>
</div>`;
	return { subject, text, html };
}


