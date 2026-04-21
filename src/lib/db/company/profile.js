/**
 * Company Profile Database Utilities
 * 
 * Provides operations for company profile and hiring needs management.
 * 
 * @module db/company/profile
 */

import { query } from '../index.js';

/**
 * Create or update company profile
 */
export async function upsertCompanyProfile(profileData) {
  const {
    companyUserId,
    organizationId,
    companyName,
    industry,
    companySize,
    website,
    description,
    companyCulture,
    hiringNeeds,
    logoUrl,
    bannerUrl
  } = profileData;
  
  const result = await query(
    `INSERT INTO company_profiles (
      company_user_id, organization_id, company_name, industry, company_size,
      website, description, company_culture, hiring_needs, logo_url, banner_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (company_user_id)
    DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      company_name = EXCLUDED.company_name,
      industry = EXCLUDED.industry,
      company_size = EXCLUDED.company_size,
      website = EXCLUDED.website,
      description = EXCLUDED.description,
      company_culture = EXCLUDED.company_culture,
      hiring_needs = EXCLUDED.hiring_needs,
      logo_url = EXCLUDED.logo_url,
      banner_url = EXCLUDED.banner_url,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      companyUserId,
      organizationId || null,
      companyName,
      industry || null,
      companySize || null,
      website || null,
      description || null,
      companyCulture || null,
      hiringNeeds ? JSON.stringify(hiringNeeds) : null,
      logoUrl || null,
      bannerUrl || null
    ]
  );
  
  return mapProfileRow(result.rows[0]);
}

/**
 * Get company profile
 */
export async function getCompanyProfile(companyUserId) {
  const result = await query(
    `SELECT 
      cp.*,
      u.email as company_email
    FROM company_profiles cp
    LEFT JOIN users u ON cp.company_user_id = u.id
    WHERE cp.company_user_id = $1`,
    [companyUserId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapProfileRow(result.rows[0]);
}

/**
 * Verify company profile (admin action)
 */
export async function verifyCompanyProfile(companyUserId, verifiedBy) {
  const result = await query(
    `UPDATE company_profiles
    SET is_verified = true,
        verified_by = $1,
        verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE company_user_id = $2
    RETURNING *`,
    [verifiedBy, companyUserId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Company profile not found');
  }
  
  return mapProfileRow(result.rows[0]);
}

/**
 * Unverify company profile (admin action)
 */
export async function unverifyCompanyProfile(companyUserId) {
  const result = await query(
    `UPDATE company_profiles
    SET is_verified = false,
        verified_by = NULL,
        verified_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE company_user_id = $1
    RETURNING *`,
    [companyUserId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Company profile not found');
  }
  
  return mapProfileRow(result.rows[0]);
}

/**
 * Map profile row
 */
function mapProfileRow(row) {
  return {
    id: row.id,
    companyUserId: row.company_user_id,
    organizationId: row.organization_id,
    companyName: row.company_name,
    industry: row.industry,
    companySize: row.company_size,
    website: row.website,
    description: row.description,
    companyCulture: row.company_culture,
    hiringNeeds: row.hiring_needs ? (typeof row.hiring_needs === 'string' ? JSON.parse(row.hiring_needs) : row.hiring_needs) : null,
    isVerified: row.is_verified,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    companyEmail: row.company_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
