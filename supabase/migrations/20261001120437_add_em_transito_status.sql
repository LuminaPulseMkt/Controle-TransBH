-- New transport status "Em Trânsito", between "Coletado - aguardando
-- embarque" and "Veículo em pátio - aguardando retirada". Kept in its own
-- migration (nothing else references the new label here) since a freshly
-- added enum value can't safely be used in the same transaction it was
-- added in.
ALTER TYPE public.transport_status ADD VALUE IF NOT EXISTS 'em_transito' AFTER 'coletado_aguardando_embarque';
