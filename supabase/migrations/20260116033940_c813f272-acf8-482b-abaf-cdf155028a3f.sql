-- Allow public read access to maturity_snapshots for demo/testing
-- This is appropriate since maturity snapshots are aggregate metrics, not sensitive user data

CREATE POLICY "Allow public read access to maturity snapshots"
ON public.maturity_snapshots
FOR SELECT
USING (true);

-- Also allow public insert for demo data generation
CREATE POLICY "Allow public insert to maturity snapshots"
ON public.maturity_snapshots
FOR INSERT
WITH CHECK (true);