CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id text NOT NULL,
    framework_id text,
    response text,
    evidence_ok text,
    notes text DEFAULT ''::text,
    evidence_links text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT answers_evidence_ok_check CHECK ((evidence_ok = ANY (ARRAY['Sim'::text, 'Parcial'::text, 'Não'::text, 'NA'::text]))),
    CONSTRAINT answers_response_check CHECK ((response = ANY (ARRAY['Sim'::text, 'Parcial'::text, 'Não'::text, 'NA'::text]))),
    CONSTRAINT evidence_ok_length CHECK ((length(evidence_ok) <= 20)),
    CONSTRAINT framework_id_ans_length CHECK ((length(framework_id) <= 100)),
    CONSTRAINT notes_length CHECK ((length(notes) <= 5000)),
    CONSTRAINT question_id_ans_length CHECK ((length(question_id) <= 100)),
    CONSTRAINT response_valid CHECK (((response IS NULL) OR (response = ANY (ARRAY['Sim'::text, 'Parcial'::text, 'Não'::text, 'NA'::text]))))
);


--
-- Name: assessment_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_meta (
    id text DEFAULT 'current'::text NOT NULL,
    name text DEFAULT 'Avaliação de Maturidade em Segurança de IA'::text,
    enabled_frameworks text[] DEFAULT ARRAY['NIST_AI_RMF'::text, 'ISO_27001_27002'::text, 'LGPD'::text],
    selected_frameworks text[] DEFAULT '{}'::text[],
    version text DEFAULT '2.0.0'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT meta_id_length CHECK ((length(id) <= 50)),
    CONSTRAINT meta_name_length CHECK ((length(name) <= 200)),
    CONSTRAINT meta_version_length CHECK ((length(version) <= 20))
);


--
-- Name: change_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_logs (
    id bigint NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    changes jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT action_length CHECK ((length(action) <= 50)),
    CONSTRAINT change_logs_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'disable'::text, 'enable'::text]))),
    CONSTRAINT change_logs_entity_type_check CHECK ((entity_type = ANY (ARRAY['framework'::text, 'question'::text, 'setting'::text, 'answer'::text]))),
    CONSTRAINT entity_id_length CHECK ((length(entity_id) <= 100)),
    CONSTRAINT entity_type_length CHECK ((length(entity_type) <= 50))
);


--
-- Name: change_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_logs_id_seq OWNED BY public.change_logs.id;


--
-- Name: custom_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_frameworks (
    framework_id text NOT NULL,
    framework_name text NOT NULL,
    short_name text NOT NULL,
    description text,
    target_audience text[] DEFAULT '{}'::text[],
    assessment_scope text,
    default_enabled boolean DEFAULT false,
    version text DEFAULT '1.0.0'::text,
    category text DEFAULT 'custom'::text,
    reference_links text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT assessment_scope_length CHECK ((length(assessment_scope) <= 1000)),
    CONSTRAINT category_length CHECK ((length(category) <= 50)),
    CONSTRAINT custom_frameworks_category_check CHECK ((category = ANY (ARRAY['core'::text, 'high-value'::text, 'tech-focused'::text, 'custom'::text]))),
    CONSTRAINT description_length CHECK ((length(description) <= 2000)),
    CONSTRAINT framework_id_length CHECK ((length(framework_id) <= 100)),
    CONSTRAINT framework_name_length CHECK ((length(framework_name) <= 200)),
    CONSTRAINT short_name_length CHECK ((length(short_name) <= 50)),
    CONSTRAINT version_length CHECK ((length(version) <= 20))
);


--
-- Name: custom_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_questions (
    question_id text NOT NULL,
    subcat_id text,
    domain_id text NOT NULL,
    question_text text NOT NULL,
    expected_evidence text,
    imperative_checks text,
    risk_summary text,
    frameworks text[] DEFAULT '{}'::text[],
    ownership_type text,
    criticality text DEFAULT 'Medium'::text,
    is_disabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT criticality_length CHECK ((length(criticality) <= 20)),
    CONSTRAINT custom_questions_criticality_check CHECK ((criticality = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Critical'::text]))),
    CONSTRAINT custom_questions_ownership_type_check CHECK ((ownership_type = ANY (ARRAY['Executive'::text, 'GRC'::text, 'Engineering'::text]))),
    CONSTRAINT domain_id_length CHECK ((length(domain_id) <= 50)),
    CONSTRAINT expected_evidence_length CHECK ((length(expected_evidence) <= 2000)),
    CONSTRAINT imperative_checks_length CHECK ((length(imperative_checks) <= 2000)),
    CONSTRAINT ownership_type_length CHECK ((length(ownership_type) <= 50)),
    CONSTRAINT question_id_length CHECK ((length(question_id) <= 100)),
    CONSTRAINT question_text_length CHECK ((length(question_text) <= 2000)),
    CONSTRAINT risk_summary_length CHECK ((length(risk_summary) <= 1000)),
    CONSTRAINT subcat_id_length CHECK ((length(subcat_id) <= 50))
);


--
-- Name: default_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.default_frameworks (
    framework_id text NOT NULL,
    framework_name text NOT NULL,
    short_name text NOT NULL,
    description text,
    target_audience text[] DEFAULT '{}'::text[],
    assessment_scope text,
    default_enabled boolean DEFAULT false,
    version text DEFAULT '1.0'::text,
    category text DEFAULT 'core'::text,
    reference_links text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT df_framework_id_length CHECK ((length(framework_id) <= 100)),
    CONSTRAINT df_framework_name_length CHECK ((length(framework_name) <= 200)),
    CONSTRAINT df_short_name_length CHECK ((length(short_name) <= 50))
);


--
-- Name: default_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.default_questions (
    question_id text NOT NULL,
    subcat_id text NOT NULL,
    domain_id text NOT NULL,
    question_text text NOT NULL,
    expected_evidence text,
    imperative_checks text,
    risk_summary text,
    frameworks text[] DEFAULT '{}'::text[],
    ownership_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dq_question_id_length CHECK ((length(question_id) <= 100)),
    CONSTRAINT dq_question_text_length CHECK ((length(question_text) <= 2000))
);


--
-- Name: disabled_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disabled_frameworks (
    framework_id text NOT NULL,
    disabled_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT disabled_framework_id_length CHECK ((length(framework_id) <= 100))
);


--
-- Name: disabled_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disabled_questions (
    question_id text NOT NULL,
    disabled_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT disabled_question_id_length CHECK ((length(question_id) <= 100))
);


--
-- Name: domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domains (
    domain_id text NOT NULL,
    domain_name text NOT NULL,
    display_order integer DEFAULT 1,
    nist_ai_rmf_function text,
    strategic_question text,
    description text,
    banking_relevance text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dom_domain_id_length CHECK ((length(domain_id) <= 50)),
    CONSTRAINT dom_domain_name_length CHECK ((length(domain_name) <= 200))
);


--
-- Name: maturity_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maturity_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    snapshot_type text DEFAULT 'automatic'::text NOT NULL,
    overall_score numeric(5,4) NOT NULL,
    overall_coverage numeric(5,4) NOT NULL,
    evidence_readiness numeric(5,4) NOT NULL,
    maturity_level integer NOT NULL,
    total_questions integer NOT NULL,
    answered_questions integer NOT NULL,
    critical_gaps integer NOT NULL,
    domain_metrics jsonb DEFAULT '[]'::jsonb NOT NULL,
    framework_metrics jsonb DEFAULT '[]'::jsonb NOT NULL,
    framework_category_metrics jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    CONSTRAINT maturity_snapshots_snapshot_type_check CHECK ((snapshot_type = ANY (ARRAY['automatic'::text, 'manual'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    email text,
    organization text,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcategories (
    subcat_id text NOT NULL,
    domain_id text NOT NULL,
    subcat_name text NOT NULL,
    definition text,
    objective text,
    security_outcome text,
    criticality text DEFAULT 'Medium'::text,
    weight numeric DEFAULT 1.0,
    ownership_type text,
    risk_summary text,
    framework_refs text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sub_subcat_id_length CHECK ((length(subcat_id) <= 50)),
    CONSTRAINT sub_subcat_name_length CHECK ((length(subcat_name) <= 200))
);


--
-- Name: change_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_logs ALTER COLUMN id SET DEFAULT nextval('public.change_logs_id_seq'::regclass);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: answers answers_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_key UNIQUE (question_id);


--
-- Name: assessment_meta assessment_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_meta
    ADD CONSTRAINT assessment_meta_pkey PRIMARY KEY (id);


--
-- Name: change_logs change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_logs
    ADD CONSTRAINT change_logs_pkey PRIMARY KEY (id);


--
-- Name: custom_frameworks custom_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_frameworks
    ADD CONSTRAINT custom_frameworks_pkey PRIMARY KEY (framework_id);


--
-- Name: custom_questions custom_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_questions
    ADD CONSTRAINT custom_questions_pkey PRIMARY KEY (question_id);


--
-- Name: default_frameworks default_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_frameworks
    ADD CONSTRAINT default_frameworks_pkey PRIMARY KEY (framework_id);


--
-- Name: default_questions default_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_questions
    ADD CONSTRAINT default_questions_pkey PRIMARY KEY (question_id);


--
-- Name: disabled_frameworks disabled_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabled_frameworks
    ADD CONSTRAINT disabled_frameworks_pkey PRIMARY KEY (framework_id);


--
-- Name: disabled_questions disabled_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabled_questions
    ADD CONSTRAINT disabled_questions_pkey PRIMARY KEY (question_id);


--
-- Name: domains domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_pkey PRIMARY KEY (domain_id);


--
-- Name: maturity_snapshots maturity_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_snapshots
    ADD CONSTRAINT maturity_snapshots_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (subcat_id);


--
-- Name: maturity_snapshots unique_automatic_snapshot_per_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_snapshots
    ADD CONSTRAINT unique_automatic_snapshot_per_day UNIQUE (snapshot_date, snapshot_type);


--
-- Name: idx_answers_framework_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_framework_id ON public.answers USING btree (framework_id);


--
-- Name: idx_answers_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_question_id ON public.answers USING btree (question_id);


--
-- Name: idx_change_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_logs_created_at ON public.change_logs USING btree (created_at DESC);


--
-- Name: idx_change_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_logs_entity ON public.change_logs USING btree (entity_type, entity_id);


--
-- Name: idx_custom_questions_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_questions_domain ON public.custom_questions USING btree (domain_id);


--
-- Name: idx_default_frameworks_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_default_frameworks_enabled ON public.default_frameworks USING btree (default_enabled);


--
-- Name: idx_default_questions_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_default_questions_domain ON public.default_questions USING btree (domain_id);


--
-- Name: idx_default_questions_subcat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_default_questions_subcat ON public.default_questions USING btree (subcat_id);


--
-- Name: idx_maturity_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maturity_snapshots_date ON public.maturity_snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_subcategories_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcategories_domain ON public.subcategories USING btree (domain_id);


--
-- Name: answers update_answers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assessment_meta update_assessment_meta_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assessment_meta_updated_at BEFORE UPDATE ON public.assessment_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_frameworks update_custom_frameworks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_frameworks_updated_at BEFORE UPDATE ON public.custom_frameworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_questions update_custom_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_questions_updated_at BEFORE UPDATE ON public.custom_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: answers answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assessment_meta assessment_meta_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_meta
    ADD CONSTRAINT assessment_meta_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: change_logs change_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_logs
    ADD CONSTRAINT change_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: custom_frameworks custom_frameworks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_frameworks
    ADD CONSTRAINT custom_frameworks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: custom_questions custom_questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_questions
    ADD CONSTRAINT custom_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: default_questions default_questions_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_questions
    ADD CONSTRAINT default_questions_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE CASCADE;


--
-- Name: default_questions default_questions_subcat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_questions
    ADD CONSTRAINT default_questions_subcat_id_fkey FOREIGN KEY (subcat_id) REFERENCES public.subcategories(subcat_id) ON DELETE CASCADE;


--
-- Name: disabled_frameworks disabled_frameworks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabled_frameworks
    ADD CONSTRAINT disabled_frameworks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: disabled_questions disabled_questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disabled_questions
    ADD CONSTRAINT disabled_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: maturity_snapshots maturity_snapshots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maturity_snapshots
    ADD CONSTRAINT maturity_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(domain_id) ON DELETE CASCADE;


--
-- Name: default_frameworks Allow all on default_frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all on default_frameworks" ON public.default_frameworks USING (true) WITH CHECK (true);


--
-- Name: default_questions Allow all on default_questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all on default_questions" ON public.default_questions USING (true) WITH CHECK (true);


--
-- Name: domains Allow all on domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all on domains" ON public.domains USING (true) WITH CHECK (true);


--
-- Name: subcategories Allow all on subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all on subcategories" ON public.subcategories USING (true) WITH CHECK (true);


--
-- Name: answers Users can delete own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own answers" ON public.answers FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: custom_frameworks Users can delete own custom frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own custom frameworks" ON public.custom_frameworks FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: custom_questions Users can delete own custom questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own custom questions" ON public.custom_questions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: disabled_frameworks Users can delete own disabled frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own disabled frameworks" ON public.disabled_frameworks FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: disabled_questions Users can delete own disabled questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own disabled questions" ON public.disabled_questions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: maturity_snapshots Users can delete own maturity snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own maturity snapshots" ON public.maturity_snapshots FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: answers Users can insert own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own answers" ON public.answers FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: assessment_meta Users can insert own assessment meta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own assessment meta" ON public.assessment_meta FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: change_logs Users can insert own change logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own change logs" ON public.change_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_frameworks Users can insert own custom frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own custom frameworks" ON public.custom_frameworks FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_questions Users can insert own custom questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own custom questions" ON public.custom_questions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: disabled_frameworks Users can insert own disabled frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own disabled frameworks" ON public.disabled_frameworks FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: disabled_questions Users can insert own disabled questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own disabled questions" ON public.disabled_questions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: maturity_snapshots Users can insert own maturity snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own maturity snapshots" ON public.maturity_snapshots FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: answers Users can update own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own answers" ON public.answers FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: assessment_meta Users can update own assessment meta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own assessment meta" ON public.assessment_meta FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_frameworks Users can update own custom frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own custom frameworks" ON public.custom_frameworks FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_questions Users can update own custom questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own custom questions" ON public.custom_questions FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: maturity_snapshots Users can update own maturity snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own maturity snapshots" ON public.maturity_snapshots FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: answers Users can view own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own answers" ON public.answers FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: assessment_meta Users can view own assessment meta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own assessment meta" ON public.assessment_meta FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: change_logs Users can view own change logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own change logs" ON public.change_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: custom_frameworks Users can view own custom frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own custom frameworks" ON public.custom_frameworks FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: custom_questions Users can view own custom questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own custom questions" ON public.custom_questions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: disabled_frameworks Users can view own disabled frameworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own disabled frameworks" ON public.disabled_frameworks FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: disabled_questions Users can view own disabled questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own disabled questions" ON public.disabled_questions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: maturity_snapshots Users can view own maturity snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own maturity snapshots" ON public.maturity_snapshots FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_meta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: change_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_frameworks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_frameworks ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: default_frameworks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.default_frameworks ENABLE ROW LEVEL SECURITY;

--
-- Name: default_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.default_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: disabled_frameworks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disabled_frameworks ENABLE ROW LEVEL SECURITY;

--
-- Name: disabled_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disabled_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

--
-- Name: maturity_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.maturity_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: subcategories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;