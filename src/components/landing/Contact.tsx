import { useEffect, useState } from "react";
import { Phone, Mail, MapPin, Instagram, Facebook, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export function Contact() {
  const [socials, setSocials] = useState<{ instagram_url: string | null; facebook_url: string | null }>({
    instagram_url: null,
    facebook_url: null,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_company_info").maybeSingle();
      setSocials({
        instagram_url: data?.instagram_url ?? null,
        facebook_url: data?.facebook_url ?? null,
      });
    })();
  }, []);

  const contactInfo = [
    {
      icon: Phone,
      label: "WhatsApp Comercial",
      value: "(31) 97152-3294",
      href: "https://wa.me/5531971523294"
    },
    {
      icon: Mail,
      label: "E-mail de Contato",
      value: "transbhtransportes@gmail.com",
      href: "mailto:transbhtransportes@gmail.com"
    },
    {
      icon: MapPin,
      label: "Base Operacional",
      value: "Belo Horizonte/MG - Atendimento Nacional",
      href: "https://www.google.com/maps/search/?api=1&query=Belo+Horizonte%2FMG"
    }
  ];

  const socialLinks = [
    { Icon: Instagram, href: socials.instagram_url },
    { Icon: Facebook, href: socials.facebook_url },
  ].filter((s): s is { Icon: typeof Instagram; href: string } => Boolean(s.href));

  return (
    <section id="contato" className="py-24 bg-brand-neutral">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 relative z-10"
        >
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-[55%] p-10 md:p-16">
              <h2 className="text-display text-4xl text-brand-text mb-6">Vamos Conversar?</h2>
              <p className="text-brand-graphite mb-12 text-sm leading-relaxed max-w-md">
                Nossa equipe está de plantão para tirar suas dúvidas e planejar a logística do seu veículo com total segurança.
              </p>
              
              <div className="space-y-10">
                {contactInfo.map((info, idx) => (
                  <a 
                    key={idx} 
                    href={info.href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-6 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-brand-neutral flex items-center justify-center text-brand-graphite group-hover:bg-brand-orange group-hover:text-white transition-all duration-300">
                      <info.icon size={24} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-1.5">{info.label}</div>
                      <div className="text-base md:text-lg font-bold text-brand-text group-hover:text-brand-orange transition-colors flex items-center gap-2">
                        {info.value}
                        <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              
              {socialLinks.length > 0 && (
                <div className="mt-16 pt-10 border-t border-gray-100 flex items-center gap-6">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Siga-nos</span>
                  <div className="flex gap-3">
                    {socialLinks.map(({ Icon, href }, i) => (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-brand-neutral flex items-center justify-center text-brand-graphite hover:bg-brand-blue hover:text-white transition-all"
                      >
                        <Icon size={18} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="lg:w-[45%] bg-brand-text p-10 md:p-16 text-white relative overflow-hidden flex flex-col justify-center">
               <div className="relative z-10">
                  <h3 className="text-display text-3xl mb-6">Atendimento <span className="text-brand-orange">Imediato</span></h3>
                  <p className="text-gray-400 mb-10 text-sm leading-relaxed max-w-sm">
                    Para cotações urgentes ou dúvidas rápidas, nosso canal no WhatsApp é o caminho mais curto.
                  </p>
                  <a 
                    href="https://wa.me/5531971523294" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-5 px-10 rounded-full text-base shadow-2xl shadow-brand-orange/20 transition-all hover:-translate-y-1 w-full sm:w-auto"
                  >
                    <Phone size={20} className="fill-current" />
                    Chamar no WhatsApp
                  </a>
               </div>
               
               {/* Decorative background elements */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-[100px] -mr-32 -mt-32" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-[100px] -ml-32 -mb-32" />
               
               <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none select-none">
                  <div className="font-display text-[200px] leading-none tracking-tighter">BH</div>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
