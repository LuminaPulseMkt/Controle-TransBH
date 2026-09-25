import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompanyInfo() {
  const { data } = useQuery({
    queryKey: ["public-company-info"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_company_info").maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
  return data ?? null;
}
