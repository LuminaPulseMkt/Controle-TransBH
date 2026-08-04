ALTER TABLE public.trip_sheets 
ADD COLUMN IF NOT EXISTS return_date DATE,
ADD COLUMN IF NOT EXISTS expenses JSONB DEFAULT '[]'::jsonb;