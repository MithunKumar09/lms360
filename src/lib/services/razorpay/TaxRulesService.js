/**
 * Tax Rules Service
 * 
 * Manages configurable tax rules by location and item type
 */

import { query } from '@/lib/db/index.js';

class TaxRulesService {
  /**
   * Get applicable tax rule for an item
   * @param {Object} params - Rule lookup parameters
   * @param {string} params.itemType - Item type (course, event, workshop)
   * @param {string} params.country - Country code (optional)
   * @param {string} params.state - State/province (optional)
   * @returns {Promise<Object|null>} Tax rule object or null
   */
  async getApplicableRule({ itemType, country = null, state = null }) {
    try {
      const now = new Date();

      // Build query to find matching rule
      // Priority: specific location + item type > specific location > item type > global
      let ruleQuery = `
        SELECT * FROM tax_rules
        WHERE is_active = true
          AND deleted_at IS NULL
          AND (valid_from IS NULL OR valid_from <= $1)
          AND (valid_until IS NULL OR valid_until >= $1)
          AND (
            (applicable_item_types IS NULL OR $2 = ANY(applicable_item_types))
          )
        ORDER BY
          CASE 
            WHEN country = $3 AND state = $4 AND ($2 = ANY(applicable_item_types) OR applicable_item_types IS NULL) THEN 1
            WHEN country = $3 AND state IS NULL AND ($2 = ANY(applicable_item_types) OR applicable_item_types IS NULL) THEN 2
            WHEN country IS NULL AND state IS NULL AND ($2 = ANY(applicable_item_types) OR applicable_item_types IS NULL) THEN 3
            WHEN country IS NULL AND state IS NULL AND applicable_item_types IS NULL THEN 4
            ELSE 5
          END,
          priority DESC,
          created_at DESC
        LIMIT 1
      `;

      const result = await query(ruleQuery, [now, itemType, country, state]);

      if (result.rows.length > 0) {
        return this.transformRule(result.rows[0]);
      }

      // Return default rule if none found
      return this.getDefaultRule();
    } catch (error) {
      console.error('TaxRulesService getApplicableRule error:', error);
      // Return default rule on error
      return this.getDefaultRule();
    }
  }

  /**
   * Get default tax rule
   * @returns {Object} Default rule object
   */
  getDefaultRule() {
    return {
      id: null,
      type: 'gst',
      rate: 18,
      name: 'Default GST',
      description: 'Default GST rate: 18%',
      country: null,
      state: null,
      applicableItemTypes: null,
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
      type: dbRule.type,
      name: dbRule.name,
      description: dbRule.description,
      rate: parseFloat(dbRule.rate) || 0,
      country: dbRule.country,
      state: dbRule.state,
      applicableItemTypes: dbRule.applicable_item_types || null,
      priority: dbRule.priority || 0,
      validFrom: dbRule.valid_from,
      validUntil: dbRule.valid_until,
      metadata: dbRule.metadata || {},
    };
  }

  /**
   * Calculate tax amount
   * @param {Object} params - Tax calculation parameters
   * @param {number} params.amount - Base amount
   * @param {string} params.itemType - Item type
   * @param {string} params.country - Country code (optional)
   * @param {string} params.state - State/province (optional)
   * @returns {Promise<Object>} Tax calculation result
   */
  async calculateTax({ amount, itemType, country = null, state = null }) {
    try {
      const rule = await this.getApplicableRule({ itemType, country, state });
      
      // Calculate tax based on rule type
      let taxAmount = 0;
      
      if (rule.type === 'gst' || rule.type === 'vat' || rule.type === 'sales_tax') {
        // Percentage-based tax
        taxAmount = (amount * rule.rate) / (100 + rule.rate); // Tax included in amount
      } else if (rule.type === 'custom') {
        // Custom calculation from metadata
        const customFormula = rule.metadata?.formula;
        if (customFormula) {
          // Evaluate custom formula (be careful with eval in production)
          // For now, use percentage
          taxAmount = (amount * rule.rate) / (100 + rule.rate);
        } else {
          taxAmount = (amount * rule.rate) / (100 + rule.rate);
        }
      }

      return {
        rule,
        taxAmount: Math.round(taxAmount * 100) / 100, // Round to 2 decimal places
        amountAfterTax: amount - taxAmount,
        amountBeforeTax: amount,
      };
    } catch (error) {
      console.error('TaxRulesService calculateTax error:', error);
      throw new Error(`Failed to calculate tax: ${error.message}`);
    }
  }

  /**
   * Create tax rule
   * @param {Object} ruleData - Rule data
   * @returns {Promise<Object>} Created rule
   */
  async createRule(ruleData) {
    try {
      const {
        type,
        name,
        description = null,
        rate,
        country = null,
        state = null,
        applicableItemTypes = null,
        priority = 0,
        validFrom = null,
        validUntil = null,
        createdBy = null,
        metadata = {},
      } = ruleData;

      const result = await query(
        `INSERT INTO tax_rules (
          type, name, description, rate, country, state,
          applicable_item_types, priority, valid_from, valid_until,
          created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          type,
          name,
          description,
          rate,
          country,
          state,
          applicableItemTypes,
          priority,
          validFrom,
          validUntil,
          createdBy,
          JSON.stringify(metadata),
        ]
      );

      return this.transformRule(result.rows[0]);
    } catch (error) {
      console.error('TaxRulesService createRule error:', error);
      throw new Error(`Failed to create tax rule: ${error.message}`);
    }
  }

  /**
   * Update tax rule
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
        'type',
        'name',
        'description',
        'rate',
        'country',
        'state',
        'applicable_item_types',
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
          } else if (dbKey === 'applicable_item_types' && Array.isArray(value)) {
            updateFields.push(`${dbKey} = $${paramIndex}`);
            updateValues.push(value);
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
        `UPDATE tax_rules
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex} AND deleted_at IS NULL
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new Error('Tax rule not found');
      }

      return this.transformRule(result.rows[0]);
    } catch (error) {
      console.error('TaxRulesService updateRule error:', error);
      throw new Error(`Failed to update tax rule: ${error.message}`);
    }
  }

  /**
   * Delete tax rule (soft delete)
   * @param {UUID} ruleId - Rule ID
   * @returns {Promise<boolean>} Success
   */
  async deleteRule(ruleId) {
    try {
      const result = await query(
        `UPDATE tax_rules
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [ruleId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('TaxRulesService deleteRule error:', error);
      throw new Error(`Failed to delete tax rule: ${error.message}`);
    }
  }

  /**
   * List tax rules with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Array of rules
   */
  async listRules(filters = {}) {
    try {
      const {
        type = null,
        country = null,
        state = null,
        isActive = null,
        limit = 100,
        offset = 0,
      } = filters;

      let whereClause = 'WHERE deleted_at IS NULL';
      const queryParams = [];
      let paramIndex = 1;

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        queryParams.push(type);
        paramIndex++;
      }

      if (country) {
        whereClause += ` AND country = $${paramIndex}`;
        queryParams.push(country);
        paramIndex++;
      }

      if (state) {
        whereClause += ` AND state = $${paramIndex}`;
        queryParams.push(state);
        paramIndex++;
      }

      if (isActive !== null) {
        whereClause += ` AND is_active = $${paramIndex}`;
        queryParams.push(isActive);
        paramIndex++;
      }

      queryParams.push(limit, offset);

      const result = await query(
        `SELECT * FROM tax_rules
         ${whereClause}
         ORDER BY priority DESC, created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        queryParams
      );

      return result.rows.map(row => this.transformRule(row));
    } catch (error) {
      console.error('TaxRulesService listRules error:', error);
      throw new Error(`Failed to list tax rules: ${error.message}`);
    }
  }
}

// Export singleton instance
let taxRulesServiceInstance = null;

export function getTaxRulesService() {
  if (!taxRulesServiceInstance) {
    taxRulesServiceInstance = new TaxRulesService();
  }
  return taxRulesServiceInstance;
}

export default TaxRulesService;

