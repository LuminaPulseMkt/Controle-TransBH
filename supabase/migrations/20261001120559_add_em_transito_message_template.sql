INSERT INTO public.message_templates (key, label, body) VALUES
  ('wa_status_em_transito', 'WhatsApp - Em trânsito',
   'Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) está em trânsito para o destino.')
ON CONFLICT (key) DO NOTHING;
