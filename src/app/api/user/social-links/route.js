/**
 * Social Links API Route
 * 
 * Manages user's social media links
 * GET /api/user/social-links - Fetch social links
 * PUT /api/user/social-links - Update social links
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';
import { socialLinksSchema, validateForm } from '@/lib/validation/schemas.js';

/**
 * GET /api/user/social-links
 * 
 * Fetches current user's social media links
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch social links from database
    let result;
    try {
      result = await query(
        `SELECT facebook, twitter, linkedin, website, github
         FROM user_social_links
         WHERE user_id = $1`,
        [userId]
      );
    } catch (error) {
      // If table doesn't exist yet (migration not run), return empty links
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          socialLinks: {
            facebook: null,
            twitter: null,
            linkedin: null,
            website: null,
            github: null,
          },
        });
      }
      throw error;
    }

    // If no record exists, return empty links
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        socialLinks: {
          facebook: null,
          twitter: null,
          linkedin: null,
          website: null,
          github: null,
        },
      });
    }

    const socialLinks = result.rows[0];

    return NextResponse.json({
      success: true,
      socialLinks: {
        facebook: socialLinks.facebook || null,
        twitter: socialLinks.twitter || null,
        linkedin: socialLinks.linkedin || null,
        website: socialLinks.website || null,
        github: socialLinks.github || null,
      },
    });
  } catch (error) {
    console.error('Error fetching social links:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch social links',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/social-links
 * 
 * Updates current user's social media links
 */
export async function PUT(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input - allow empty strings to be converted to null
    const normalizedBody = {};
    Object.keys(body).forEach((key) => {
      normalizedBody[key] = body[key] === '' ? null : body[key];
    });

    const validation = validateForm(socialLinksSchema, normalizedBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const socialLinks = validation.data;

    try {
      // Check if record exists
      const existingResult = await query(
        `SELECT id FROM user_social_links WHERE user_id = $1`,
        [userId]
      );

      if (existingResult.rows.length === 0) {
        // Insert new record
        await query(
          `INSERT INTO user_social_links (user_id, facebook, twitter, linkedin, website, github)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            socialLinks.facebook || null,
            socialLinks.twitter || null,
            socialLinks.linkedin || null,
            socialLinks.website || null,
            socialLinks.github || null,
          ]
        );
      } else {
        // Update existing record
        await query(
          `UPDATE user_social_links
           SET facebook = $1, twitter = $2, linkedin = $3, website = $4, github = $5, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $6`,
          [
            socialLinks.facebook || null,
            socialLinks.twitter || null,
            socialLinks.linkedin || null,
            socialLinks.website || null,
            socialLinks.github || null,
            userId,
          ]
        );
      }
    } catch (error) {
      // If table doesn't exist yet (migration not run), return error
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            success: false,
            error: 'Database migration pending. Please run migration 008_user_profile_and_social_links.sql',
          },
          { status: 503 }
        );
      }
      throw error;
    }

    // Return updated social links
    return NextResponse.json({
      success: true,
      socialLinks: {
        facebook: socialLinks.facebook || null,
        twitter: socialLinks.twitter || null,
        linkedin: socialLinks.linkedin || null,
        website: socialLinks.website || null,
        github: socialLinks.github || null,
      },
    });
  } catch (error) {
    console.error('Error updating social links:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update social links',
      },
      { status: 500 }
    );
  }
}

