# Database Configuration

This directory contains the database connection and configuration files.

## Setup

1. Copy `.env.local.example` to `.env.local` (create it if it doesn't exist)
2. Fill in your PostgreSQL connection details in `.env.local`
3. Run `npm run db:test` to verify the connection

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Option 1: Full connection string
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Option 2: Individual variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edurock_db
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL_MODE=prefer
DB_POOL_MIN=2
DB_POOL_MAX=10
```

## Usage

### Basic Query

```javascript
import { query } from '@/lib/db';

const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Transaction

```javascript
import { getClient } from '@/lib/db';

const client = await getClient();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### Health Check

```javascript
import { healthCheck } from '@/lib/db';

const health = await healthCheck();
console.log(health.status); // 'healthy' or 'unhealthy'
```

## Testing Connection

Run the test script:

```bash
npm run db:test
```

This will verify your database connection and display connection pool information.


