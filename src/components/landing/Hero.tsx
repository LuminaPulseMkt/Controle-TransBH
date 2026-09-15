import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/lib/use-site-settings";
import { Shield, Clock, MapPin, ArrowRight } from "lucide-react";

export function Hero() {
  const { getSetting } = useSiteSettings();
  const heroBg = getSetting("hero_bg");

  const scrollToOrcamento = () => {
    const element = document.getElementById("orcamento");
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <section id="home" className={`relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden ${heroBg ? "bg-white" : "bg-brand-neutral"}`}>
      {/* Background Image with Overlay */}
      {heroBg && (
        <>
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-white/60 via-transparent to-white/60" />
        </>
      )}
      
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-bold mb-6">
              <Shield className="w-3 h-3" />
              <span>TRANSPORTE 100% SEGURADO</span>
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-display text-4xl md:text-7xl text-brand-text mb-6 leading-[1.1] tracking-tight"
          >
            Sua tranquilidade é nossa <span className="text-brand-orange">rota principal</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-brand-graphite mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Especialistas no transporte de carros, motos e frotas. 
            Segurança total e rastreamento em tempo real em todo o território nacional.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              onClick={scrollToOrcamento}
              size="lg"
              className="bg-brand-orange hover:bg-brand-orange-dark text-white text-sm px-8 py-4 h-auto font-bold rounded-full shadow-xl shadow-brand-orange/20 transition-all hover:-translate-y-1 group"
            >
              Solicitar Orçamento
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const element = document.getElementById("sobre");
                if (element) {
                   window.scrollTo({ top: element.offsetTop - 80, behavior: "smooth" });
                }
              }}
              className="border-gray-200 text-brand-graphite hover:bg-gray-50 text-sm px-8 py-4 h-auto font-bold rounded-full transition-all"
            >
              Conhecer a Empresa
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto"
          >
            {[
              { icon: Shield, label: "Seguro Total", desc: "Cobertura Completa" },
              { icon: Clock, label: "Agilidade", desc: "Prazos Cumpridos" },
              { icon: MapPin, label: "Todo Brasil", desc: "Entrega Nacional" },
              { icon: ArrowRight, label: "Suporte 24h", desc: "Sempre com Você" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center p-4 rounded-2xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md hover:-translate-y-1">
                <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-3">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-brand-text">{stat.label}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
