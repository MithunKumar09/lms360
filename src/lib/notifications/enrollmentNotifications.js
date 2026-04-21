/**
 * Enrollment Notifications
 * 
 * Handles notifications for course enrollments created from payments
 */

import { query } from '@/lib/db/index.js';
import { sendEmail } from '@/lib/email/send.js';

/**
 * Send enrollment notification to user
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - User ID
 * @param {string} params.courseId - Course ID
 * @param {string} params.enrollmentId - Enrollment ID
 * @param {string} params.orderId - Order ID (optional)
 * @returns {Promise<void>}
 */
export async function sendEnrollmentNotification({ userId, courseId, enrollmentId, orderId = null }) {
  try {
    // Get user and course details
    const [userResult, courseResult] = await Promise.all([
      query(`SELECT id, email, first_name, last_name FROM users WHERE id = $1`, [userId]),
      query(`SELECT id, title, slug FROM courses WHERE id = $1`, [courseId]),
    ]);

    if (userResult.rows.length === 0 || courseResult.rows.length === 0) {
      console.error('User or course not found for enrollment notification');
      return;
    }

    const user = userResult.rows[0];
    const course = courseResult.rows[0];
    const userName = user.first_name || user.email.split('@')[0];

    // Create in-app notification
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, action_url)
       VALUES ($1, 'course_enrollment', $2, $3, $4::jsonb, $5)`,
      [
        userId,
        'Course Enrollment Confirmed',
        `You have been successfully enrolled in "${course.title}". Start learning now!`,
        JSON.stringify({
          enrollment_id: enrollmentId,
          course_id: courseId,
          course_title: course.title,
          order_id: orderId,
        }),
        `/courses/${course.id}`,
      ]
    ).catch(err => console.error('Failed to create in-app notification:', err));

    // Send email notification (non-blocking)
    const emailSubject = `Welcome to ${course.title}!`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${course.title}!</h2>
        <p>Hi ${userName},</p>
        <p>Congratulations! You have been successfully enrolled in <strong>${course.title}</strong>.</p>
        <p>You can now start learning at your own pace. Click the button below to access your course:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://edurock.com'}/courses/${course.id}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Start Learning
          </a>
        </div>
        <p>Happy learning!</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `;
    const emailText = `
Welcome to ${course.title}!

Hi ${userName},

Congratulations! You have been successfully enrolled in ${course.title}.

You can now start learning at your own pace. Visit the following link to access your course:
${process.env.NEXT_PUBLIC_APP_URL || 'https://edurock.com'}/courses/${course.id}

Happy learning!
    `;

    // Send email asynchronously (don't block)
    sendEmail({
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      category: 'course_enrollment',
    }).catch(err => console.error('Failed to send enrollment email:', err));

  } catch (error) {
    // Don't throw - notification failures shouldn't break enrollment
    console.error('Failed to send enrollment notification:', error);
  }
}

/**
 * Send enrollment notification for event/workshop registration
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - User ID
 * @param {string} params.itemId - Event or Workshop ID
 * @param {string} params.itemType - 'event' or 'workshop'
 * @param {string} params.registrationId - Registration ID
 * @param {string} params.orderId - Order ID (optional)
 * @returns {Promise<void>}
 */
export async function sendRegistrationNotification({ userId, itemId, itemType, registrationId, orderId = null }) {
  try {
    // Get user and item details
    const [userResult, itemResult] = await Promise.all([
      query(`SELECT id, email, first_name, last_name FROM users WHERE id = $1`, [userId]),
      query(`SELECT id, title FROM ${itemType}s WHERE id = $1`, [itemId]),
    ]);

    if (userResult.rows.length === 0 || itemResult.rows.length === 0) {
      console.error(`User or ${itemType} not found for registration notification`);
      return;
    }

    const user = userResult.rows[0];
    const item = itemResult.rows[0];
    const userName = user.first_name || user.email.split('@')[0];
    const itemTypeCapitalized = itemType.charAt(0).toUpperCase() + itemType.slice(1);

    // Create in-app notification
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, action_url)
       VALUES ($1, '${itemType}_registration', $2, $3, $4::jsonb, $5)`,
      [
        userId,
        `${itemTypeCapitalized} Registration Confirmed`,
        `You have been successfully registered for "${item.title}".`,
        JSON.stringify({
          registration_id: registrationId,
          item_id: itemId,
          item_type: itemType,
          item_title: item.title,
          order_id: orderId,
        }),
        `/${itemType}s/${item.id}`,
      ]
    ).catch(err => console.error('Failed to create in-app notification:', err));

    // Send email notification (non-blocking)
    const emailSubject = `Registration Confirmed: ${item.title}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Registration Confirmed!</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your registration for <strong>${item.title}</strong> has been confirmed.</p>
        <p>Click the button below to view your ${itemType} details:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://edurock.com'}/${itemType}s/${item.id}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View ${itemTypeCapitalized}
          </a>
        </div>
        <p>We look forward to seeing you there!</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `;
    const emailText = `
Registration Confirmed: ${item.title}

Hi ${userName},

Great news! Your registration for ${item.title} has been confirmed.

Visit the following link to view your ${itemType} details:
${process.env.NEXT_PUBLIC_APP_URL || 'https://edurock.com'}/${itemType}s/${item.id}

We look forward to seeing you there!
    `;

    // Send email asynchronously (don't block)
    sendEmail({
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      category: `${itemType}_registration`,
    }).catch(err => console.error(`Failed to send ${itemType} registration email:`, err));

  } catch (error) {
    // Don't throw - notification failures shouldn't break registration
    console.error(`Failed to send ${itemType} registration notification:`, error);
  }
}

