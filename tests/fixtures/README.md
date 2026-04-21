# Test Fixtures

This directory contains test data fixtures for E2E tests.

## Files

- `test-users.json` - Test user credentials and roles
- `test-courses.json` - Test course data

## Usage

Load fixtures in your tests:

```javascript
import testUsers from '../fixtures/test-users.json';

const student = testUsers.students[0];
await authenticateUser(page, student.email, student.password);
```

## Setup

1. Update fixture files with actual test data from your test database
2. Ensure test users exist in your test database
3. Ensure test courses exist in your test database
4. Never commit real production credentials

## Environment Variables

Alternatively, use environment variables:

```bash
TEST_USER_EMAIL=student@test.com
TEST_USER_PASSWORD=testpassword123
TEST_COURSE_ID=test-course-1
```
