-- Fix existing maturity_snapshots with NULL user_id by assigning to demo user
UPDATE maturity_snapshots 
SET user_id = '1fa185a5-5754-4586-8d63-68866b6539e6'
WHERE user_id IS NULL;

-- Also fix chart_annotations with NULL user_id
UPDATE chart_annotations 
SET user_id = '1fa185a5-5754-4586-8d63-68866b6539e6'
WHERE user_id IS NULL;