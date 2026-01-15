-- ============================================================
-- PHASE 1: Multi-Domain Security Governance Evolution
-- ============================================================
-- This migration adds the Security Domain concept to the platform,
-- enabling support for AI Security, Cloud Security, and DevSecOps.
-- All existing data is migrated to the AI_SECURITY domain.
-- ============================================================

-- 1. Create security_domains table
CREATE TABLE public.security_domains (
    domain_id TEXT PRIMARY KEY,
    domain_name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'shield',
    display_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    color TEXT DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_domains ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read domains (they are global)
CREATE POLICY "Anyone can view security domains"
ON public.security_domains
FOR SELECT
USING (true);

-- 2. Insert the initial security domains
INSERT INTO public.security_domains (domain_id, domain_name, short_name, description, display_order, icon, color) VALUES
('AI_SECURITY', 'AI Security', 'AI Sec', 'Segurança de IA: riscos de modelo, dados, runtime, governança e abuso', 1, 'brain', 'purple'),
('CLOUD_SECURITY', 'Cloud Security', 'Cloud Sec', 'Segurança em nuvem: responsabilidade compartilhada, identidade, proteção de dados, postura', 2, 'cloud', 'blue'),
('DEVSECOPS', 'DevSecOps Security', 'DevSecOps', 'Segurança de desenvolvimento: AppSec, InfraSec, CI/CD e Pipeline Security', 3, 'code', 'green');

-- 3. Add security_domain_id to default_frameworks
ALTER TABLE public.default_frameworks 
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 4. Add security_domain_id to custom_frameworks  
ALTER TABLE public.custom_frameworks
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 5. Add security_domain_id to assessment_meta (for scoping assessments)
ALTER TABLE public.assessment_meta
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 6. Add security_domain_id to answers (for domain-scoped answers)
ALTER TABLE public.answers
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 7. Add security_domain_id to maturity_snapshots
ALTER TABLE public.maturity_snapshots
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 8. Add security_domain_id to domains (taxonomy domains, not security domains)
ALTER TABLE public.domains
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 9. Add security_domain_id to subcategories
ALTER TABLE public.subcategories
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 10. Add security_domain_id to default_questions
ALTER TABLE public.default_questions
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 11. Add security_domain_id to custom_questions
ALTER TABLE public.custom_questions
ADD COLUMN IF NOT EXISTS security_domain_id TEXT DEFAULT 'AI_SECURITY';

-- 12. Update existing frameworks with their correct domain
-- AI Security frameworks remain as AI_SECURITY (default)
-- Cloud-related frameworks
UPDATE public.default_frameworks 
SET security_domain_id = 'CLOUD_SECURITY'
WHERE framework_id IN ('CSA_CCM');

-- DevSecOps frameworks  
UPDATE public.default_frameworks
SET security_domain_id = 'DEVSECOPS'
WHERE framework_id IN ('NIST_SSDF', 'OWASP_API');

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_default_frameworks_security_domain 
ON public.default_frameworks(security_domain_id);

CREATE INDEX IF NOT EXISTS idx_custom_frameworks_security_domain 
ON public.custom_frameworks(security_domain_id);

CREATE INDEX IF NOT EXISTS idx_answers_security_domain 
ON public.answers(security_domain_id);

CREATE INDEX IF NOT EXISTS idx_domains_security_domain 
ON public.domains(security_domain_id);

CREATE INDEX IF NOT EXISTS idx_default_questions_security_domain 
ON public.default_questions(security_domain_id);

-- 14. Add trigger to update updated_at on security_domains
CREATE TRIGGER update_security_domains_updated_at
BEFORE UPDATE ON public.security_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();