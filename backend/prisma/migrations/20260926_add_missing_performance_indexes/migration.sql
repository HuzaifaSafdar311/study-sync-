-- Migration: Add missing performance indexes to frequently queried tables

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_idx" ON "subscriptions"("stripe_subscription_id");

-- Tasks table courseId index
CREATE INDEX IF NOT EXISTS "tasks_course_id_idx" ON "tasks"("course_id");

-- Reminders table taskId index
CREATE INDEX IF NOT EXISTS "reminders_task_id_idx" ON "reminders"("task_id");

-- Courses table userId index
CREATE INDEX IF NOT EXISTS "courses_user_id_idx" ON "courses"("user_id");

-- Course materials table courseId and userId indexes
CREATE INDEX IF NOT EXISTS "course_materials_course_id_idx" ON "course_materials"("course_id");
CREATE INDEX IF NOT EXISTS "course_materials_user_id_idx" ON "course_materials"("user_id");

-- Audit log table userId, action, and createdAt indexes
CREATE INDEX IF NOT EXISTS "audit_log_user_id_idx" ON "audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log"("action");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log"("created_at");
