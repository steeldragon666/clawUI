-- Convert heartbeats to a TimescaleDB hypertable
-- Run AFTER the initial Drizzle migration creates the table
SELECT create_hypertable('heartbeats', 'time', if_not_exists => TRUE);

-- Continuous aggregate: completions per hour (last 7 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_task_completions
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', completed_at) AS bucket,
  tenant_id,
  count(*) AS completed_count,
  avg(actual_duration) AS avg_duration,
  count(*) FILTER (WHERE status = 'done') AS success_count,
  count(*) FILTER (WHERE status = 'failed') AS failure_count
FROM tasks
WHERE completed_at IS NOT NULL
GROUP BY bucket, tenant_id;
