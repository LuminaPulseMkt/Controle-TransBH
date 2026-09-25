-- Items 3, 5 and 6 of the client briefing: default, admin-editable WhatsApp
-- message templates sent automatically on each transport status change.
-- The "finalizado" message doubles as the item 6 thank-you + Google review
-- link, per the briefing's flow (Finalizado -> conclusão/agradecimento ->
-- link de avaliação).

INSERT INTO public.message_templates (key, label, body) VALUES
  ('wa_status_aguardando_coleta', 'WhatsApp - Aguardando coleta',
   'Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) foi cadastrado na {company_name} e está aguardando programação de coleta.'),
  ('wa_status_coletado_aguardando_embarque', 'WhatsApp - Coletado, aguardando embarque',
   'Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) já foi coletado e está aguardando embarque para o destino.'),
  ('wa_status_veiculo_patio_aguardando_retirada', 'WhatsApp - Veículo em pátio, aguardando retirada',
   'Olá {client_name}! Seu veículo {vehicle_plate} (transporte {transport_code}) chegou e está no pátio aguardando retirada.'),
  ('wa_status_finalizado', 'WhatsApp - Finalizado (agradecimento + avaliação)',
   'Olá {client_name}! Seu transporte {transport_code} foi finalizado com sucesso. Agradecemos a confiança na {company_name}! Se puder, deixe sua avaliação: {review_link}')
ON CONFLICT (key) DO NOTHING;
