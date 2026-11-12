-- Additive, repeatable initialization matching shared/schema.ts.
-- Existing tables and records are never dropped or replaced.
CREATE TABLE IF NOT EXISTS public.users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text,
  credits integer NOT NULL DEFAULT 0,
  is_unlimited boolean NOT NULL DEFAULT false,
  google_id text UNIQUE,
  email text,
  display_name text
);

CREATE TABLE IF NOT EXISTS public.user_visits (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES public.users(id),
  email text,
  visited_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_results (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES public.users(id),
  analysis_type text NOT NULL,
  llm_provider text NOT NULL,
  input_text text NOT NULL,
  additional_context text,
  results jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp DEFAULT now(),
  completed_at timestamp
);

CREATE TABLE IF NOT EXISTS public.dialogue_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id varchar NOT NULL REFERENCES public.analysis_results(id),
  sender text NOT NULL,
  message text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES public.users(id),
  stripe_session_id text NOT NULL,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  credits integer NOT NULL,
  status text NOT NULL,
  created_at timestamp DEFAULT now(),
  completed_at timestamp
);

CREATE TABLE IF NOT EXISTS public.reference_examples (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type text NOT NULL,
  example_type text NOT NULL,
  question_id text,
  label text NOT NULL,
  content text NOT NULL,
  notes text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_visits_user_id_visited_at_idx
  ON public.user_visits (user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS analysis_results_user_id_created_at_idx
  ON public.analysis_results (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dialogue_messages_analysis_id_created_at_idx
  ON public.dialogue_messages (analysis_id, created_at);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_expire_idx
  ON public.user_sessions (expire);
