# Database Seeders

This directory contains database seeding scripts to populate the database with initial data.

## Available Seeders

### Superadmin User Seeder

Creates the initial superadmin user with the following credentials:

- **Email:** `mithunkumarkulal33@gmail.com`
- **Password:** `##/*%qwerty098765`
- **Role:** `superadmin`
- **Organization ID:** `NULL` (global owner)
- **MFA Enabled:** `true` (MFA setup required on first login)

### Superadmin User Seeder 2

Creates an additional superadmin user with the following credentials:

- **Email:** `upriseproedge360@gmail.com`
- **Password:** `Uprise@amit123`
- **Role:** `superadmin`
- **Organization ID:** `NULL` (global owner)
- **MFA Enabled:** `true` (MFA setup required on first login)

## Usage

### Run All Seeders

```bash
npm run seed
# or
npm run db:seed
```

### Run Individual Seeder

```bash
node src/lib/db/seeders/seed-superadmin.js
node src/lib/db/seeders/seed-superadmin-2.js
```

## Features

### Idempotent

All seeders are **idempotent** - safe to run multiple times:
- Checks if data already exists before creating
- Updates existing data if needed
- No duplicate entries

### Transaction Safety

- Each seeder runs in a database transaction
- Automatic rollback on error
- Atomic operations

### Security

- Passwords are hashed using bcrypt (12 salt rounds)
- No plain text passwords stored
- Proper error handling

## Prerequisites

1. **Database migrations must be run first:**
   ```bash
   npm run db:migrate
   ```

2. **Database connection must be configured:**
   - Ensure `.env` or `.env.local` has database credentials
   - Test connection: `npm run db:test`

## Seeder Structure

Each seeder should:
- Export a function that returns `{ success: boolean, created: boolean, user?: object }`
- Be idempotent (safe to run multiple times)
- Use transactions for data integrity
- Provide clear logging
- Handle errors gracefully

## Adding New Seeders

1. Create a new file: `src/lib/db/seeders/seed-<name>.js`
2. Export a seeding function
3. Add it to `src/lib/db/seeders/index.js`:

```javascript
import { seedYourNewSeeder } from './seed-your-new-seeder.js';

const seeders = [
  { name: 'Superadmin User', fn: seedSuperadmin },
  { name: 'Your New Seeder', fn: seedYourNewSeeder }, // Add here
];
```

## Troubleshooting

### Error: "users table does not exist"

**Solution:** Run migrations first:
```bash
npm run db:migrate
```

### Error: "Database connection failed"

**Solution:** Check your `.env` or `.env.local` file and ensure database credentials are correct.

### Error: "Superadmin already exists"

**Not an error!** The seeder is idempotent. If the user exists, it will:
- Show existing user details
- Verify password hash
- Update password if hash doesn't match

### Error: "Permission denied"

**Solution:** Ensure your database user has INSERT and UPDATE permissions on the `users` table.

## Security Notes

⚠️ **Important:**
- The superadmin password is hardcoded in the seeder for initial setup
- **Change the password after first login** in production
- MFA is enabled but not verified - user must complete MFA setup
- Never commit actual production passwords to version control

## Next Steps

After seeding:

1. ✅ Verify superadmin was created: Check database or logs
2. ✅ Complete MFA setup (when MFA page is implemented)
3. ✅ Change password (recommended for production)
4. ✅ Proceed with authentication implementation


