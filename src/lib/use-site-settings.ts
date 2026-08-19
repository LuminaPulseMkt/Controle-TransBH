import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteImageKey = "hero_bg" | "about_img" | "features_img" | "lead_form_bg";

export function useSiteSettings() {
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      
      const map: Record<string, string> = {};
      data?.forEach((item) => {
        map[item.key] = item.value;
      });
      return map;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getSetting = (key: SiteImageKey, defaultValue: string = "") => {
    return settings?.[key] || defaultValue;
  };

  return { settings, getSetting, isLoading, refetch };
}
