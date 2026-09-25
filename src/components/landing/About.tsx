import { motion } from "framer-motion";
import { useSiteSettings } from "@/lib/use-site-settings";
import { Check } from "lucide-react";

export function About() {
  const { getSetting } = useSiteSettings();
  const aboutImg = getSetting("about_img");

  return (
    <section id="sobre" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden aspect-[4/5] lg:aspect-square shadow-2xl group">
                {aboutImg ? (
                  <img 
                    src={aboutImg} 
                    alt="Pátio TransBH" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-graphite to-brand-text flex items-center justify-center p-12">
                    <span className="text-white/20 font-display text-8xl rotate-12 tracking-tighter select-none">TRANSBH</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-text/60 to-transparent opacity-60" />
              </div>
              
              {/* Decorative frames */}
              <div className="absolute -top-6 -left-6 w-32 h-32 border-l-4 border-t-4 border-brand-orange/30 rounded-tl-3xl z-0" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 border-r-4 border-b-4 border-brand-blue/30 rounded-br-3xl z-0" />
              
              {/* Floating stats card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="absolute -bottom-10 -right-10 lg:right-10 bg-white p-8 rounded-3xl shadow-2xl z-20 border border-gray-100 hidden sm:block"
              >
                <div className="text-brand-orange font-display text-5xl mb-1">+10</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Anos de Histórico</div>
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:w-1/2"
          >
            <h2 className="text-display text-4xl text-brand-text mb-6 leading-tight">
              Excelência e <span className="text-brand-blue">Compromisso</span> com seu Veículo
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-brand-orange to-brand-blue mb-10 rounded-full" />
            
            <div className="space-y-8 text-brand-graphite text-base leading-relaxed">
              <p>
                A <strong>TransBH</strong> surgiu com o propósito de redefinir o padrão de transporte veicular no Brasil, priorizando a segurança absoluta e a transparência total em cada etapa do processo.
              </p>
              <p>
                Com uma estrutura moderna e motoristas rigorosamente treinados, entregamos mais que logística: entregamos a tranquilidade de saber que seu patrimônio está em mãos de especialistas.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                {[
                  { title: "Seguro Total", desc: "Cobertura completa inclusa." },
                  { title: "Frota Própria", desc: "Veículos modernos e revisados." },
                  { title: "Entrega Porta-a-Porta", desc: "Conforto total para você." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-orange/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-brand-orange stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-text text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
