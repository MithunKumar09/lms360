/**
 * Invite email template (accept link)
 */

import { DEFAULT_LOCALE } from '../send.js';

export function inviteTemplate({ orgLabel, roleTitle, expiryHours = 72, acceptUrl, temporaryPassword = null, mode = 'invite_link', locale = DEFAULT_LOCALE }) {
	const subject = locale === 'en'
		? `You're invited to join ${orgLabel} as ${roleTitle}`
		: `You're invited to join ${orgLabel} as ${roleTitle}`;
	
	let text, html;
	
	if (mode === 'temp_password_email' && temporaryPassword) {
		// Temporary password email
		text = `You have been invited to join ${orgLabel} as ${roleTitle}.

This invite will expire in ${expiryHours} hours.

Your temporary password is: ${temporaryPassword}

IMPORTANT: You must change this password when you first log in.

Accept your invitation and set your password:
${acceptUrl}

After accepting, you can log in with:
Email: ${acceptUrl.split('?token=')[0].split('/invite/accept')[0]}/auth/login
Temporary Password: ${temporaryPassword}
`;
		html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <h2>Invitation to join ${orgLabel}</h2>
  <p>You have been invited to join <strong>${orgLabel}</strong> as <strong>${roleTitle}</strong>.</p>
  <p>This invite will expire in <strong>${expiryHours} hours</strong>.</p>
  <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #1a56db">
    <p style="margin:0 0 8px 0;font-weight:600">Your Temporary Password:</p>
    <p style="margin:0;font-family:monospace;font-size:18px;letter-spacing:2px;color:#1a56db">${temporaryPassword}</p>
  </div>
  <p style="color:#dc2626;font-weight:600">⚠️ IMPORTANT: You must change this password when you first log in.</p>
  <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a56db;color:#fff;border-radius:6px;text-decoration:none">Accept Invitation & Set Password</a></p>
  <p>Or paste this link into your browser:<br/><a href="${acceptUrl}">${acceptUrl}</a></p>
</div>`;
	} else {
		// Invite link email (original)
		text = `You have been invited to join ${orgLabel} as ${roleTitle}.

This invite will expire in ${expiryHours} hours.

Accept your invitation:
${acceptUrl}
`;
		html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <h2>Invitation to join ${orgLabel}</h2>
  <p>You have been invited to join <strong>${orgLabel}</strong> as <strong>${roleTitle}</strong>.</p>
  <p>This invite will expire in <strong>${expiryHours} hours</strong>.</p>
  <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a56db;color:#fff;border-radius:6px;text-decoration:none">Accept Invitation</a></p>
  <p>Or paste this link into your browser:<br/><a href="${acceptUrl}">${acceptUrl}</a></p>
</div>`;
	}
	
	return { subject, text, html };
}


