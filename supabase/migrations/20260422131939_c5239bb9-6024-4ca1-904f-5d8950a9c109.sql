ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_ip text,
  ADD COLUMN IF NOT EXISTS accepted_contract_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_transport_id uuid REFERENCES public.transports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_receivable_id uuid REFERENCES public.receivables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_accepted_contract_id ON public.documents(accepted_contract_id);