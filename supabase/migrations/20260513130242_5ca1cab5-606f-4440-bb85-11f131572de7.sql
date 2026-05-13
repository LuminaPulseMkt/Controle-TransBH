-- Histórico de pagamentos por recebível
CREATE TABLE public.receivable_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id uuid NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_receivable_payments_receivable_id ON public.receivable_payments(receivable_id);
CREATE INDEX idx_receivable_payments_paid_at ON public.receivable_payments(paid_at);

ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view receivable payments"
  ON public.receivable_payments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins insert receivable payments"
  ON public.receivable_payments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins update receivable payments"
  ON public.receivable_payments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins delete receivable payments"
  ON public.receivable_payments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role));

-- Backfill a partir dos recebíveis existentes
INSERT INTO public.receivable_payments (receivable_id, amount, paid_at, note)
SELECT
  r.id,
  CASE WHEN r.status = 'paid' THEN r.amount
       ELSE COALESCE(r.paid_amount, r.amount) END,
  COALESCE(r.paid_at, r.updated_at::date, CURRENT_DATE),
  'Migrado automaticamente'
FROM public.receivables r
WHERE (r.status = 'paid')
   OR (r.status = 'partial' AND COALESCE(r.paid_amount, 0) > 0);