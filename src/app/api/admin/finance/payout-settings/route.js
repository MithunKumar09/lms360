/**
 * Payout Settings API Route
 * 
 * GET /api/admin/finance/payout-settings - List payout settings
 * POST /api/admin/finance/payout-settings - Create/update payout settings
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/payout-settings
 * List payout settings with filters
 * 
 * Query Parameters:
 * - entityType: Filter by entity type ('vendor', 'organization', 'superadmin')
 * - entityId: Filter by specific entity ID (vendor_account_id, organization_account_id, or superadmin_account_id)
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);
    
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (entityType) {
      whereClause += ` AND ps.entity_type = $${paramIndex}`;
      queryParams.push(entityType);
      paramIndex++;
    }

    if (entityId) {
      // Match entityId to the appropriate column based on entityType
      if (entityType === 'vendor') {
        whereClause += ` AND ps.vendor_account_id = $${paramIndex}`;
      } else if (entityType === 'organization') {
        whereClause += ` AND ps.organization_account_id = $${paramIndex}`;
      } else if (entityType === 'superadmin') {
        whereClause += ` AND ps.superadmin_account_id = $${paramIndex}`;
      } else {
        // Try to match any of the entity columns
        whereClause += ` AND (ps.vendor_account_id = $${paramIndex} OR ps.organization_account_id = $${paramIndex} OR ps.superadmin_account_id = $${paramIndex})`;
      }
      queryParams.push(entityId);
      paramIndex++;
    }

    // Get payout settings with entity details
    const settingsResult = await query(
      `SELECT 
         ps.*,
         CASE 
           WHEN ps.entity_type = 'vendor' THEN va.user_id
           WHEN ps.entity_type = 'organization' THEN oa.org_id
           WHEN ps.entity_type = 'superadmin' THEN sa.user_id
         END as entity_user_id
       FROM payout_settings ps
       LEFT JOIN vendor_accounts va ON ps.vendor_account_id = va.id
       LEFT JOIN organization_accounts oa ON ps.organization_account_id = oa.id
       LEFT JOIN superadmin_accounts sa ON ps.superadmin_account_id = sa.id
       ${whereClause}
       ORDER BY ps.created_at DESC`,
      queryParams
    );

    const settings = settingsResult.rows.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      vendorAccountId: row.vendor_account_id,
      organizationAccountId: row.organization_account_id,
      superadminAccountId: row.superadmin_account_id,
      entityUserId: row.entity_user_id,
      enabled: row.enabled,
      thresholdAmount: parseFloat(row.threshold_amount),
      currency: row.currency,
      defaultMode: row.default_mode,
      scheduleType: row.schedule_type,
      scheduleDay: row.schedule_day,
      scheduleDayOfWeek: row.schedule_day_of_week,
      minPayoutAmount: parseFloat(row.min_payout_amount),
      maxPayoutAmount: row.max_payout_amount ? parseFloat(row.max_payout_amount) : null,
      notes: row.notes,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Get payout settings error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get payout settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance/payout-settings
 * Create or update payout settings
 * 
 * Request Body:
 * {
 *   "entityType": "vendor" | "organization" | "superadmin",
 *   "vendorAccountId": "uuid" (if entityType is vendor),
 *   "organizationAccountId": "uuid" (if entityType is organization),
 *   "superadminAccountId": "uuid" (if entityType is superadmin),
 *   "enabled": boolean,
 *   "thresholdAmount": number,
 *   "currency": "INR",
 *   "defaultMode": "NEFT" | "IMPS" | "RTGS",
 *   "scheduleType": "threshold" | "daily" | "weekly" | "monthly",
 *   "scheduleDay": number (1-31, for monthly),
 *   "scheduleDayOfWeek": number (0-6, for weekly),
 *   "minPayoutAmount": number,
 *   "maxPayoutAmount": number | null,
 *   "notes": string | null
 * }
 */
export async function POST(request) {
  try {
    const session = await requireSuperadmin(request);
    const body = await request.json();
    
    const {
      entityType,
      vendorAccountId,
      organizationAccountId,
      superadminAccountId,
      enabled = false,
      thresholdAmount,
      currency = 'INR',
      defaultMode = 'NEFT',
      scheduleType = 'threshold',
      scheduleDay = null,
      scheduleDayOfWeek = null,
      minPayoutAmount = 100.00,
      maxPayoutAmount = null,
      notes = null,
    } = body;

    // Validate entityType
    if (!entityType || !['vendor', 'organization', 'superadmin'].includes(entityType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid entityType. Must be vendor, organization, or superadmin' },
        { status: 400 }
      );
    }

    // Validate entity ID based on entityType
    let entityAccountId;
    if (entityType === 'vendor') {
      if (!vendorAccountId) {
        return NextResponse.json(
          { success: false, error: 'vendorAccountId is required when entityType is vendor' },
          { status: 400 }
        );
      }
      entityAccountId = vendorAccountId;
    } else if (entityType === 'organization') {
      if (!organizationAccountId) {
        return NextResponse.json(
          { success: false, error: 'organizationAccountId is required when entityType is organization' },
          { status: 400 }
        );
      }
      entityAccountId = organizationAccountId;
    } else if (entityType === 'superadmin') {
      if (!superadminAccountId) {
        return NextResponse.json(
          { success: false, error: 'superadminAccountId is required when entityType is superadmin' },
          { status: 400 }
        );
      }
      entityAccountId = superadminAccountId;
    }

    if (!thresholdAmount || thresholdAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'thresholdAmount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if settings already exist
    let existingSettings;
    if (entityType === 'vendor') {
      const existingResult = await query(
        `SELECT id FROM payout_settings WHERE vendor_account_id = $1`,
        [vendorAccountId]
      );
      existingSettings = existingResult.rows[0];
    } else if (entityType === 'organization') {
      const existingResult = await query(
        `SELECT id FROM payout_settings WHERE organization_account_id = $1`,
        [organizationAccountId]
      );
      existingSettings = existingResult.rows[0];
    } else if (entityType === 'superadmin') {
      const existingResult = await query(
        `SELECT id FROM payout_settings WHERE superadmin_account_id = $1`,
        [superadminAccountId]
      );
      existingSettings = existingResult.rows[0];
    }

    let result;
    if (existingSettings) {
      // Update existing settings
      if (entityType === 'vendor') {
        result = await query(
          `UPDATE payout_settings
           SET enabled = $1,
               threshold_amount = $2,
               currency = $3,
               default_mode = $4,
               schedule_type = $5,
               schedule_day = $6,
               schedule_day_of_week = $7,
               min_payout_amount = $8,
               max_payout_amount = $9,
               notes = $10,
               updated_at = CURRENT_TIMESTAMP
           WHERE vendor_account_id = $11
           RETURNING *`,
          [
            enabled,
            thresholdAmount,
            currency,
            defaultMode,
            scheduleType,
            scheduleDay,
            scheduleDayOfWeek,
            minPayoutAmount,
            maxPayoutAmount,
            notes,
            vendorAccountId,
          ]
        );
      } else if (entityType === 'organization') {
        result = await query(
          `UPDATE payout_settings
           SET enabled = $1,
               threshold_amount = $2,
               currency = $3,
               default_mode = $4,
               schedule_type = $5,
               schedule_day = $6,
               schedule_day_of_week = $7,
               min_payout_amount = $8,
               max_payout_amount = $9,
               notes = $10,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_account_id = $11
           RETURNING *`,
          [
            enabled,
            thresholdAmount,
            currency,
            defaultMode,
            scheduleType,
            scheduleDay,
            scheduleDayOfWeek,
            minPayoutAmount,
            maxPayoutAmount,
            notes,
            organizationAccountId,
          ]
        );
      } else if (entityType === 'superadmin') {
        result = await query(
          `UPDATE payout_settings
           SET enabled = $1,
               threshold_amount = $2,
               currency = $3,
               default_mode = $4,
               schedule_type = $5,
               schedule_day = $6,
               schedule_day_of_week = $7,
               min_payout_amount = $8,
               max_payout_amount = $9,
               notes = $10,
               updated_at = CURRENT_TIMESTAMP
           WHERE superadmin_account_id = $11
           RETURNING *`,
          [
            enabled,
            thresholdAmount,
            currency,
            defaultMode,
            scheduleType,
            scheduleDay,
            scheduleDayOfWeek,
            minPayoutAmount,
            maxPayoutAmount,
            notes,
            superadminAccountId,
          ]
        );
      }
    } else {
      // Create new settings
      result = await query(
        `INSERT INTO payout_settings (
          entity_type, vendor_account_id, organization_account_id, superadmin_account_id,
          enabled, threshold_amount, currency, default_mode,
          schedule_type, schedule_day, schedule_day_of_week,
          min_payout_amount, max_payout_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          entityType,
          vendorAccountId || null,
          organizationAccountId || null,
          superadminAccountId || null,
          enabled,
          thresholdAmount,
          currency,
          defaultMode,
          scheduleType,
          scheduleDay,
          scheduleDayOfWeek,
          minPayoutAmount,
          maxPayoutAmount,
          notes,
        ]
      );
    }

    const setting = result.rows[0];

    return NextResponse.json({
      success: true,
      setting: {
        id: setting.id,
        entityType: setting.entity_type,
        vendorAccountId: setting.vendor_account_id,
        organizationAccountId: setting.organization_account_id,
        superadminAccountId: setting.superadmin_account_id,
        enabled: setting.enabled,
        thresholdAmount: parseFloat(setting.threshold_amount),
        currency: setting.currency,
        defaultMode: setting.default_mode,
        scheduleType: setting.schedule_type,
        scheduleDay: setting.schedule_day,
        scheduleDayOfWeek: setting.schedule_day_of_week,
        minPayoutAmount: parseFloat(setting.min_payout_amount),
        maxPayoutAmount: setting.max_payout_amount ? parseFloat(setting.max_payout_amount) : null,
        notes: setting.notes,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at,
      },
      message: existingSettings ? 'Payout settings updated successfully' : 'Payout settings created successfully',
    });
  } catch (error) {
    console.error('Create/update payout settings error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create/update payout settings' },
      { status: 500 }
    );
  }
}
