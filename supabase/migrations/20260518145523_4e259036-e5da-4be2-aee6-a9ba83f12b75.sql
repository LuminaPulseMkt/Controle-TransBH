-- Recriar enum vehicle_type com novos valores
ALTER TYPE public.vehicle_type RENAME TO vehicle_type_old;

CREATE TYPE public.vehicle_type AS ENUM ('motorcycle', 'sedan', 'hatch', 'caminhonete', 'suv');

-- Remover default antes da conversão
ALTER TABLE public.transports ALTER COLUMN vehicle_type DROP DEFAULT;

-- Converter coluna existente: motorcycle preserva; car/truck/machinery viram sedan
ALTER TABLE public.transports
  ALTER COLUMN vehicle_type TYPE public.vehicle_type
  USING (
    CASE vehicle_type::text
      WHEN 'motorcycle' THEN 'motorcycle'::public.vehicle_type
      ELSE 'sedan'::public.vehicle_type
    END
  );

ALTER TABLE public.transports ALTER COLUMN vehicle_type SET DEFAULT 'sedan'::public.vehicle_type;

DROP TYPE public.vehicle_type_old;