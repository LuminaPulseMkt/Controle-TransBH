
-- Seed test data for dashboard verification
WITH t AS (
  INSERT INTO public.transports (client_name, client_phone, origin_city, origin_state, destination_city, destination_state, vehicle_plate, vehicle_brand, vehicle_model, vehicle_type, status, partner_quoted_amount, created_at)
  VALUES
    ('João Silva',     '31999990001', 'Belo Horizonte', 'MG', 'São Paulo',     'SP', 'ABC1D23', 'Toyota',   'Corolla', 'car', 'delivered',  800,  now() - interval '5 days'),
    ('Maria Souza',    '31999990002', 'Belo Horizonte', 'MG', 'Rio de Janeiro','RJ', 'XYZ9K88', 'Honda',    'Civic',   'car', 'in_transit', 1200, now() - interval '2 days'),
    ('Carlos Pereira', '31999990003', 'Belo Horizonte', 'MG', 'Curitiba',      'PR', 'QWE4R56', 'Volkswagen','Gol',    'car', 'pending',    600,  now() - interval '1 day'),
    ('Ana Costa',      '31999990004', 'Belo Horizonte', 'MG', 'Salvador',      'BA', 'ZZZ1A11', 'Fiat',     'Uno',     'car', 'delivered',  900,  now() - interval '10 days')
  RETURNING id, client_name, client_phone, created_at
)
INSERT INTO public.receivables (transport_id, client_name, client_phone, amount, due_date, status, paid_at, paid_amount)
SELECT
  t.id, t.client_name, t.client_phone,
  CASE t.client_name
    WHEN 'João Silva' THEN 2500
    WHEN 'Maria Souza' THEN 3200
    WHEN 'Carlos Pereira' THEN 1800
    WHEN 'Ana Costa' THEN 2200
  END AS amount,
  CASE t.client_name
    WHEN 'João Silva' THEN (CURRENT_DATE - 3)
    WHEN 'Maria Souza' THEN (CURRENT_DATE + 5)
    WHEN 'Carlos Pereira' THEN (CURRENT_DATE - 10)
    WHEN 'Ana Costa' THEN (CURRENT_DATE - 8)
  END AS due_date,
  (CASE t.client_name
    WHEN 'João Silva' THEN 'paid'
    WHEN 'Maria Souza' THEN 'pending'
    WHEN 'Carlos Pereira' THEN 'pending'
    WHEN 'Ana Costa' THEN 'paid'
  END)::payment_status AS status,
  CASE t.client_name
    WHEN 'João Silva' THEN (CURRENT_DATE - 2)
    WHEN 'Ana Costa' THEN (CURRENT_DATE - 7)
    ELSE NULL
  END AS paid_at,
  CASE t.client_name
    WHEN 'João Silva' THEN 2500
    WHEN 'Ana Costa' THEN 2200
    ELSE NULL
  END AS paid_amount
FROM t;

-- Payment records mirroring the paid receivables
INSERT INTO public.receivable_payments (receivable_id, amount, paid_at, note)
SELECT r.id, r.paid_amount, r.paid_at, 'Pagamento integral (seed)'
FROM public.receivables r WHERE r.status = 'paid' AND r.paid_amount IS NOT NULL;

-- A couple of expenses in the current month
INSERT INTO public.payables (category, description, amount, expense_date)
VALUES
  ('Combustível', 'Diesel da semana',   450, CURRENT_DATE - 3),
  ('Manutenção',  'Troca de pneus',     1200, CURRENT_DATE - 6);
