# Parent Dashboard Test Suite

## Overview
Comprehensive test coverage for Parent Dashboard features including:
- Parent-student linking validation
- Permission checks
- Feature enable/disable
- API access restrictions
- UI behavior tests
- Edge cases

## Test Files

### 1. `parent-student-linking.test.js`
Tests parent-student relationship validation:
- ✅ Parent can only see linked children
- ✅ Unlinked students are not accessible
- ✅ Permission flags included in student data
- ✅ Role-based access control
- ✅ Database error handling

### 2. `parent-permissions.test.js`
Tests permission checking functions:
- ✅ `can_view_progress` permission check
- ✅ `can_view_attendance` permission check
- ✅ `can_view_achievements` permission check
- ✅ `can_view_activity_log` permission check
- ✅ Permission priority resolution (per-student > per-parent > org-wide)
- ✅ Default permissions when no settings exist

### 3. `parent-access-settings.test.js`
Tests feature enable/disable via `parent_access_settings`:
- ✅ Activity log access control
- ✅ Engagement stats access control
- ✅ Achievements access control
- ✅ Certificate visibility filtering
- ✅ Settings priority resolution

### 4. `parent-api-access-restrictions.test.js`
Tests API-level access restrictions:
- ✅ Access to linked students only
- ✅ Denial of access to unlinked students
- ✅ Cross-organization access prevention
- ✅ Relationship verification before permission checks
- ✅ Edge cases (missing studentId, invalid formats)

### 5. `parent-edge-cases.test.js`
Tests edge cases and error scenarios:
- ✅ Missing organization context
- ✅ Invalid student IDs
- ✅ Database error handling
- ✅ Concurrent access scenarios
- ✅ Permission state changes
- ✅ Large dataset handling

### 6. `parent-dashboard-ui.test.js` (Components)
Tests UI component behavior:
- ✅ Conditional rendering based on student selection
- ✅ Loading states
- ✅ Empty states
- ✅ Error states
- ✅ Feature visibility based on permissions

## Integration Tests

### `parent-dashboard-integration.test.js`
End-to-end integration tests:
- ✅ Parent-student linking flow from admin panel
- ✅ Permission updates flow
- ✅ Feature enable/disable flow
- ✅ Permission cascade (per-student > per-parent > org-wide)
- ✅ Multiple students handling

## Running Tests

```bash
# Run all parent dashboard tests
npm test -- tests/unit/api/parent

# Run specific test file
npm test -- tests/unit/api/parent/parent-permissions.test.js

# Run with coverage
npm run test:coverage -- tests/unit/api/parent

# Run in watch mode
npm run test:watch -- tests/unit/api/parent
```

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage for API routes and permission functions
- **Integration Tests**: All critical flows covered
- **Component Tests**: All UI conditional rendering scenarios
- **Edge Cases**: All identified edge cases and error scenarios

## Mock Data

Test files use consistent mock data:
- `testParentId`: 'parent-user-id'
- `testOrgId`: 'test-org-id'
- `testStudentId`: 'student-1-id'
- `testLinkedStudentId`: 'linked-student-id'
- `testUnlinkedStudentId`: 'unlinked-student-id'

## Expected Results

All tests should pass with:
- ✅ Green status for all assertions
- ✅ No console errors
- ✅ Proper error messages for failure cases
- ✅ Correct HTTP status codes
- ✅ Proper data filtering based on permissions

## Notes

- Tests use Jest with React Testing Library
- Database queries are mocked using `jest.mock`
- Authentication is mocked using `createMockSession`
- All async operations use proper `await` and error handling
