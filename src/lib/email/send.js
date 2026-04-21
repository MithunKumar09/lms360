/**
 * SendGrid email service wrapper with dev/test mode.
 * Env:
 * - SENDGRID_API_KEY
 * - EMAIL_FROM
 * - APP_BASE_URL
 * - DEFAULT_LOCALE
 */

let sgMail = null;
try {
	// Lazy import to avoid hard failure if not installed in dev
	sgMail = (await import('@sendgrid/mail')).default;
} catch {
	sgMail = null;
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@example.com';
const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE || 'en';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FORCE_EMAIL_SEND = process.env.FORCE_EMAIL_SEND === 'true' || process.env.DISABLE_EMAIL_TEST_MODE === 'true';

function isTestMode() {
	// If API key is not set, always use test mode
	if (!SENDGRID_API_KEY) {
		return true;
	}
	
	// If FORCE_EMAIL_SEND is enabled, always send real emails
	if (FORCE_EMAIL_SEND) {
		return false;
	}
	
	// In production, always send real emails if API key exists
	if (process.env.NODE_ENV === 'production') {
		return false;
	}
	
	// In development: if API key exists, send real emails (changed behavior)
	// Previously: would use test mode in development
	// Now: if API key is set, send real emails even in development
	return false; // Changed: send real emails if API key exists
}

export async function sendEmail({ to, subject, html, text, category }) {
	const testMode = isTestMode();
	
	if (testMode) {
		// Test mode: log instead of sending (only when API key is missing)
		console.log('[email:test] ⚠️ TEST MODE - Email not sent (SENDGRID_API_KEY not set)', { 
			to, 
			subject, 
			text: text ? String(text).slice(0, 200) : undefined, 
			category 
		});
		return { id: 'test-email', test: true };
	}
	if (!sgMail) {
		throw new Error('SendGrid SDK not available. Please install @sendgrid/mail.');
	}
	
	console.log('[email:send] 📧 Sending real email via SendGrid', {
		to,
		from: EMAIL_FROM,
		subject,
		category,
		env: process.env.NODE_ENV,
	});
	
	sgMail.setApiKey(SENDGRID_API_KEY);
	const msg = {
		to,
		from: EMAIL_FROM,
		subject,
		text,
		html,
		mailSettings: {
			sandboxMode: { enable: false },
		},
		categories: category ? [category] : undefined,
	};
	
	try {
		const [res] = await sgMail.send(msg);
		const messageId = res.headers['x-message-id'] || res.headers['x-message-id'.toLowerCase()] || null;
		console.log('[email:send] ✅ Email sent successfully', { messageId, to, subject });
		return { id: messageId, test: false };
	} catch (error) {
		console.error('[email:send] ❌ Failed to send email via SendGrid', {
			to,
			subject,
			error: error.message,
			code: error.code,
			response: error.response?.body,
		});
		throw error;
	}
}

export { EMAIL_FROM, DEFAULT_LOCALE, SENDGRID_API_KEY };


