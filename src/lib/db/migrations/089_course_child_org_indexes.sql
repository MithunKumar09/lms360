-- Indexes for the highest-query-volume tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_modules_org_id
    ON course_modules(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_enrollments_org_id
    ON course_enrollments(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_lessons_org_id
    ON course_lessons(org_id)
    WHERE org_id IS NOT NULL;