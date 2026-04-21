# Database Migrations

This directory contains database migration files that are applied in sequential order.

## Migration Files

Migration files follow the naming convention: `XXX_description.sql` where:
- `XXX` is a 3-digit number (001, 002, 003, etc.)
- `description` is a lowercase, underscore-separated description

Example: `001_initial_schema.sql`

## Running Migrations

### Run All Pending Migrations

```bash
npm run db:migrate
```

This will:
1. Check which migrations have been applied
2. Run all pending migrations in order
3. Record each migration in the `schema_migrations` table
4. Calculate and store checksums for verification

### Run a Specific Migration

```bash
node src/lib/db/migrations/run-migration.js 001_initial_schema.sql
```

### Check Migration Status

```bash
npm run db:migrate:status
```

## Migration System Features

- **Idempotent**: Safe to run multiple times
- **Checksum Verification**: Detects if migration files were modified after being applied
- **Transaction Safety**: Each migration runs in a transaction (rollback on error)
- **Tracking**: All applied migrations are recorded in `schema_migrations` table
- **Ordering**: Migrations are applied in numerical order

## Creating New Migrations

1. Create a new file following the naming convention: `XXX_description.sql`
2. Write your SQL migration code
3. Test the migration: `npm run db:migrate`
4. Commit the migration file to version control

## Migration File Structure

```sql
-- ============================================================================
-- Migration: XXX_description.sql
-- Description: Brief description of what this migration does
-- Created: YYYY-MM-DD
-- ============================================================================

-- Your SQL statements here
-- Use IF NOT EXISTS for idempotency
-- Use DO blocks for conditional logic (like creating types)

-- Example:
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ...
);
```

## Best Practices

1. **Always use IF NOT EXISTS** for tables, indexes, etc.
2. **Use transactions** for complex migrations (handled automatically)
3. **Test migrations** on a development database first
4. **Never modify** applied migration files (create a new migration instead)
5. **Add comments** to document complex migrations
6. **Use CHECK constraints** for data validation
7. **Add indexes** for frequently queried columns
8. **Consider performance** for large data migrations

## Troubleshooting

### Migration Already Applied

If a migration shows as already applied but you need to re-run it:
1. Remove the record from `schema_migrations` table
2. Re-run the migration

### Checksum Mismatch

If you see a checksum mismatch warning:
- The migration file was modified after being applied
- Create a new migration to make changes instead
- Or manually update the checksum in `schema_migrations` (not recommended)

### Migration Fails

If a migration fails:
- The transaction is automatically rolled back
- Fix the migration file
- Re-run the migration
- Check the error message for details

## Schema Migrations Table

The `schema_migrations` table tracks all applied migrations:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
```

Columns:
- `id`: UUID primary key
- `migration_name`: Name of the migration file
- `applied_at`: Timestamp when migration was applied
- `checksum`: SHA-256 hash of migration file content


