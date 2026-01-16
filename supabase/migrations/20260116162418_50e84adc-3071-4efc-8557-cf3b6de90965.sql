-- Drop the existing constraint first, then the index
ALTER TABLE maturity_snapshots DROP CONSTRAINT IF EXISTS unique_automatic_snapshot_per_day;

-- Create new unique constraint that allows one automatic snapshot per day PER security domain
CREATE UNIQUE INDEX unique_automatic_snapshot_per_day_domain 
ON maturity_snapshots (snapshot_date, snapshot_type, COALESCE(security_domain_id, 'default'))
WHERE snapshot_type = 'automatic';