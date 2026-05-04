CREATE OR REPLACE FUNCTION public.get_contract_token_for_budget(_budget_token text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.public_token
  FROM public.documents b
  JOIN public.documents c ON c.id = b.accepted_contract_id
  WHERE b.public_token = _budget_token
    AND _budget_token IS NOT NULL
    AND length(_budget_token) >= 10
    AND b.accepted_contract_id IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_contract_token_for_budget(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_token_for_budget(text) TO anon, authenticated;