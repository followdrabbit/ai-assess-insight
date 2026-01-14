-- Add length constraints to custom_frameworks table
ALTER TABLE public.custom_frameworks 
  ADD CONSTRAINT framework_id_length CHECK (length(framework_id) <= 100),
  ADD CONSTRAINT framework_name_length CHECK (length(framework_name) <= 200),
  ADD CONSTRAINT short_name_length CHECK (length(short_name) <= 50),
  ADD CONSTRAINT description_length CHECK (length(description) <= 2000),
  ADD CONSTRAINT assessment_scope_length CHECK (length(assessment_scope) <= 1000),
  ADD CONSTRAINT category_length CHECK (length(category) <= 50),
  ADD CONSTRAINT version_length CHECK (length(version) <= 20);

-- Add length constraints to custom_questions table
ALTER TABLE public.custom_questions 
  ADD CONSTRAINT question_id_length CHECK (length(question_id) <= 100),
  ADD CONSTRAINT question_text_length CHECK (length(question_text) <= 2000),
  ADD CONSTRAINT domain_id_length CHECK (length(domain_id) <= 50),
  ADD CONSTRAINT subcat_id_length CHECK (length(subcat_id) <= 50),
  ADD CONSTRAINT criticality_length CHECK (length(criticality) <= 20),
  ADD CONSTRAINT ownership_type_length CHECK (length(ownership_type) <= 50),
  ADD CONSTRAINT risk_summary_length CHECK (length(risk_summary) <= 1000),
  ADD CONSTRAINT expected_evidence_length CHECK (length(expected_evidence) <= 2000),
  ADD CONSTRAINT imperative_checks_length CHECK (length(imperative_checks) <= 2000);

-- Add length constraints to answers table
ALTER TABLE public.answers 
  ADD CONSTRAINT question_id_ans_length CHECK (length(question_id) <= 100),
  ADD CONSTRAINT framework_id_ans_length CHECK (length(framework_id) <= 100),
  ADD CONSTRAINT notes_length CHECK (length(notes) <= 5000),
  ADD CONSTRAINT evidence_ok_length CHECK (length(evidence_ok) <= 20),
  ADD CONSTRAINT response_valid CHECK (response IS NULL OR response IN ('Sim', 'Parcial', 'Não', 'NA'));

-- Add length constraints to change_logs table
ALTER TABLE public.change_logs 
  ADD CONSTRAINT action_length CHECK (length(action) <= 50),
  ADD CONSTRAINT entity_type_length CHECK (length(entity_type) <= 50),
  ADD CONSTRAINT entity_id_length CHECK (length(entity_id) <= 100);

-- Add length constraints to disabled_frameworks table
ALTER TABLE public.disabled_frameworks 
  ADD CONSTRAINT disabled_framework_id_length CHECK (length(framework_id) <= 100);

-- Add length constraints to disabled_questions table
ALTER TABLE public.disabled_questions 
  ADD CONSTRAINT disabled_question_id_length CHECK (length(question_id) <= 100);

-- Add length constraints to assessment_meta table
ALTER TABLE public.assessment_meta 
  ADD CONSTRAINT meta_id_length CHECK (length(id) <= 50),
  ADD CONSTRAINT meta_name_length CHECK (length(name) <= 200),
  ADD CONSTRAINT meta_version_length CHECK (length(version) <= 20);