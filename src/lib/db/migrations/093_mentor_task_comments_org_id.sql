DO $$ BEGIN
    ALTER TABLE mentor_task_comments ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

UPDATE mentor_task_comments SET org_id = mt.org_id
FROM mentor_tasks mt
WHERE mentor_task_comments.task_id = mt.id
  AND mentor_task_comments.org_id IS NULL
  AND mt.org_id IS NOT NULL;