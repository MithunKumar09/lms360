/**
 * Commission Rules Service
 * 
 * Manages configurable commission rules at global, organization, and course levels
 */

import { query } from '@/lib/db/index.js';

class CommissionRulesService {
  /**
   * Get applicable commission rule for an item
   * Hierarchy: course-level > org-level > global defaults
   * @param {Object} params - Rule lookup parameters
   * @param {UUID} params.courseId - Course ID (optional)
   * @param {UUID} params.orgId - Organization ID (optional)
   * @returns {Promise<Object|null>} Commission rule object or null
   */
  async getApplicableRule({ courseId = null, orgId = null }) {
    try {
      const now = new Date();

      // Try course-level rule first
      if (courseId) {
        const courseRule = await query(
          `SELECT * FROM commission_rules
           WHERE scope = 'course' AND course_id = $1
             AND is_active = true
             AND deleted_at IS NULL
             AND (valid_from IS NULL OR valid_from <= $2)
             AND (valid_until IS NULL OR valid_until >= $2)
           ORDER BY priority DESC, created_at DESC
           LIMIT 1`,
          [courseId, now]
        );

        if (courseRule.rows.length > 0) {
          return this.transformRule(courseRule.rows[0]);
        }
      }

      // Try org-level rule
      if (orgId) {
        const orgRule = await query(
          `SELECT * FROM commission_rules
           WHERE scope = 'organization' AND org_id = $1
             AND is_active = true
             AND deleted_at IS NULL
             AND (valid_from IS NULL OR valid_from <= $2)
             AND (valid_until IS NULL OR valid_until >= $2)
           ORDER BY priority DESC, created_at DESC
           LIMIT 1`,
          [orgId, now]
        );

        if (orgRule.rows.length > 0) {
          return this.transformRule(orgRule.rows[0]);
        }
      }

      // Fall back to global rule
      const globalRule = await query(
        `SELECT * FROM commission_rules
         WHERE scope = 'global'
           AND is_active = true
           AND deleted_at IS NULL
           AND (valid_from IS NULL OR valid_from <= $1)
           AND (valid_until IS NULL OR valid_until >= $1)
         ORDER BY priority DESC, created_at DESC
         LIMIT 1`,
        [now]
      );

      if (globalRule.rows.length > 0) {
        return this.transformRule(globalRule.rows[0]);
      }

      // Return default rule if none found
      return this.getDefaultRule();
    } catch (error) {
      console.error('CommissionRulesService getApplicableRule error:', error);
      // Return default rule on error
      return this.getDefaultRule();
    }
  }

  /**
   * Get default commission rule
   * @returns {Object} Default rule object
   */
  getDefaultRule() {
    return {
      id: null,
      scope: 'global',
      platformPercentage: 10,
      platformFixedFeePercentage: 2,
      platformFixedFeeAmount: null,
      name: 'Default Commission Rule',
      description: 'Default commission: 10% + 2% fixed fee',
    };
  }

  /**
   * Transform database rule to service format
   * @param {Object} dbRule - Rule from database
   * @returns {Object} Transformed rule
   */
  transformRule(dbRule) {
    return {
      id: dbRule.id,
      scope: dbRule.scope,
      orgId: dbRule.org_id,
      courseId: dbRule.course_id,
      platformPercentage: parseFloat(dbRule.platform_percentage) || 0,
      platformFixedFeePercentage: parseFloat(dbRule.platform_fixed_fee_percentage) || 0,
      platformFixedFeeAmount: dbRule.platform_fixed_fee_amount ? parseFloat(dbRule.platform_fixed_fee_amount) : null,
      name: dbRule.name,
      description: dbRule.description,
      priority: dbRule.priority || 0,
      validFrom: dbRule.valid_from,
      validUntil: dbRule.valid_until,
      metadata: dbRule.metadata || {},
    };
  }

  /**
   * Create commission rule
   * @param {Object} ruleData - Rule data
   * @returns {Promise<Object>} Created rule
   */
  async createRule(ruleData) {
    try {
      const {
        scope,
        orgId = null,
        courseId = null,
        platformPercentage,
        platformFixedFeePercentage = 0,
        platformFixedFeeAmount = null,
        name = null,
        description = null,
        priority = 0,
        validFrom = null,
        validUntil = null,
        createdBy = null,
        metadata = {},
      } = ruleData;

      // Validate scope-specific requirements
      if (scope === 'organization' && !orgId) {
        throw new Error('orgId is required for organization scope');
      }
      if (scope === 'course' && !courseId) {
        throw new Error('courseId is required for course scope');
      }

      const result = await query(
        `INSERT INTO commission_rules (
          scope, org_id, course_id, platform_percentage, platform_fixed_fee_percentage,
          platform_fixed_fee_amount, name, description, priority, valid_from, valid_until,
          created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          scope,
          orgId,
          courseId,
          platformPercentage,
          platformFixedFeePercentage,
          platformFixedFeeAmount,
          name,
          description,
          priority,
          validFrom,
          validUntil,
          createdBy,
          JSON.stringify(metadata),
        ]
      );

      return this.transformRule(result.rows[0]);
    } catch (error) {
      console.error('CommissionRulesService createRule error:', error);
      throw new Error(`Failed to create commission rule: ${error.message}`);
    }
  }

  /**
   * Update commission rule
   * @param {UUID} ruleId - Rule ID
   * @param {Object} updates - Rule updates
   * @returns {Promise<Object>} Updated rule
   */
  async updateRule(ruleId, updates) {
    try {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedFields = [
        'platform_percentage',
        'platform_fixed_fee_percentage',
        'platform_fixed_fee_amount',
        'name',
        'description',
        'priority',
        'valid_from',
        'valid_until',
        'is_active',
        'metadata',
      ];

      for (const [key, value] of Object.entries(updates)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbKey)) {
          if (dbKey === 'metadata' && typeof value === 'object') {
            updateFields.push(`${dbKey} = $${paramIndex}`);
            updateValues.push(JSON.stringify(value));
          } else {
            updateFields.push(`${dbKey} = $${paramIndex}`);
            updateValues.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(ruleId);

      const result = await query(
        `UPDATE commission_rules
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex} AND deleted_at IS NULL
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new Error('Commission rule not found');
      }

      return this.transformRule(result.rows[0]);
    } catch (error) {
      console.error('CommissionRulesService updateRule error:', error);
      throw new Error(`Failed to update commission rule: ${error.message}`);
    }
  }

  /**
   * Delete commission rule (soft delete)
   * @param {UUID} ruleId - Rule ID
   * @returns {Promise<boolean>} Success
   */
  async deleteRule(ruleId) {
    try {
      const result = await query(
        `UPDATE commission_rules
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [ruleId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('CommissionRulesService deleteRule error:', error);
      throw new Error(`Failed to delete commission rule: ${error.message}`);
    }
  }

  /**
   * List commission rules with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Array of rules
   */
  async listRules(filters = {}) {
    try {
      const {
        scope = null,
        orgId = null,
        courseId = null,
        isActive = null,
        limit = 100,
        offset = 0,
      } = filters;

      let whereClause = 'WHERE deleted_at IS NULL';
      const queryParams = [];
      let paramIndex = 1;

      if (scope) {
        whereClause += ` AND scope = $${paramIndex}`;
        queryParams.push(scope);
        paramIndex++;
      }

      if (orgId) {
        whereClause += ` AND org_id = $${paramIndex}`;
        queryParams.push(orgId);
        paramIndex++;
      }

      if (courseId) {
        whereClause += ` AND course_id = $${paramIndex}`;
        queryParams.push(courseId);
        paramIndex++;
      }

      if (isActive !== null) {
        whereClause += ` AND is_active = $${paramIndex}`;
        queryParams.push(isActive);
        paramIndex++;
      }

      queryParams.push(limit, offset);

      const result = await query(
        `SELECT * FROM commission_rules
         ${whereClause}
         ORDER BY scope, priority DESC, created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        queryParams
      );

      return result.rows.map(row => this.transformRule(row));
    } catch (error) {
      console.error('CommissionRulesService listRules error:', error);
      throw new Error(`Failed to list commission rules: ${error.message}`);
    }
  }
}

// Export singleton instance
let commissionRulesServiceInstance = null;

export function getCommissionRulesService() {
  if (!commissionRulesServiceInstance) {
    commissionRulesServiceInstance = new CommissionRulesService();
  }
  return commissionRulesServiceInstance;
}

export default CommissionRulesService;

