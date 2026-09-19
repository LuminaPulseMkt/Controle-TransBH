-- Fix: company_settings SELECT policy was tightened to admins/settings-managers only
-- (see 20260518185811_...), which silently broke every public/collaborator-facing
-- surface that reads non-sensitive company info (logo, name, phone, socials) for
-- display or PDF generation: the public document page (/d/$token), the public
-- feedback page (/feedback), BrandLogo (used app-wide, including on the public
-- landing page and login screen), and PDF export helpers used by collaborators
-- without the settings.manage permission.
--
-- company_settings holds only public marketing/contact info (no secrets), so expose
-- those fields through a read-only SECURITY DEFINER RPC instead of relaxing the
-- table's RLS policy.

CREATE OR REPLACE FUNCTION public.get_public_company_info()
RETURNS TABLE (
  name text,
  logo_url text,
  cnpj text,
  address text,
  phone text,
  whatsapp text,
  email text,
  website text,
  instagram_url text,
  facebook_url text,
  whatsapp_url text,
  google_business_url text,
  google_review_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name, logo_url, cnpj, address, phone, whatsapp, email, website,
         instagram_url, facebook_url, whatsapp_url, google_business_url, google_review_url
  FROM public.company_settings
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_company_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_company_info() TO anon, authenticated;
