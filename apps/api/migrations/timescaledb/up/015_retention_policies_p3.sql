-- 015_retention_policies_p3.sql
-- Retention policies for Phase 3 continuous aggregates
-- Must run AFTER 014_analytics_aggregates.sql

-- 90-day retention for zone_analytics_hourly (detailed hourly data)
SELECT add_retention_policy('zone_analytics_hourly', INTERVAL '90 days');

-- 365-day retention for site_analytics_daily (daily rollup kept longer)
SELECT add_retention_policy('site_analytics_daily', INTERVAL '365 days');
