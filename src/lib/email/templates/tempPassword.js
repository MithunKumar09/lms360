/**
 * Temp password delivery template
 */

import { DEFAULT_LOCALE } from '../send.js';

export function tempPasswordTemplate({ email, tempPassword, locale = DEFAULT_LOCALE, appUrl }) {
	const subject = locale === 'en'
		? `Your temporary password`
		: `Your temporary password`;
	const text = `An account has been created for ${email}.

Temporary password: ${tempPassword}
Please sign in and reset your password immediately.

Sign in: ${appUrl}
`;
	const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <h2>Your temporary password</h2>
  <p>An account has been created for <strong>${email}</strong>.</p>
  <p><strong>Temporary password:</strong> <code>${tempPassword}</code></p>
  <p>Please sign in and reset your password immediately.</p>
  <p><a href="${appUrl}" style="display:inline-block;padding:10px 16px;background:#1a56db;color:#fff;border-radius:6px;text-decoration:none">Sign In</a></p>
</div>`;
	return { subject, text, html };
}


