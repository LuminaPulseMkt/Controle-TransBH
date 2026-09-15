import { ShieldCheck, MapPin, Truck, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/lib/use-site-settings";

export function Features() {
  const { getSetting } = useSiteSettings();
  const featuresImg = getSetting("features_img");
  const features = [
    {
      title: "Rastreamento em Tempo Real",
      description: "Saiba exatamente onde seu veículo está durante todo o trajeto com nosso sistema de geolocalização.",
      icon: MapPin,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
      delay: 0.1,
    },
    {
      title: "Seguro Total da Carga",
      description: "Tranquilidade garantida com cobertura securitária completa contra qualquer eventualidade.",
      icon: ShieldCheck,
      color: "text-brand-orange",
      bg: "bg-brand-orange/10",
      delay: 0.2,
    },
    {
      title: "Frota Própria",
      description: "Cegonheiras modernas e motoristas treinados para manuseio seguro de veículos de todos os portes.",
      icon: Truck,
      color: "text-brand-graphite",
      bg: "bg-brand-graphite/10",
      delay: 0.3,
    },
    {
      title: "Suporte Personalizado",
      description: "Comunicação direta e ágil. Tire suas dúvidas e receba atualizações rapidamente via WhatsApp.",
      icon: MessageSquare,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
      delay: 0.4,
    },
  ];

  return (
    <section className={`relative py-24 overflow-hidden ${featuresImg ? "" : "bg-white"}`}>
      {featuresImg && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${featuresImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="container mx-auto px-6 relative z-10">
        <div className="relative text-center mb-20">
          {featuresImg && (
            <div className="absolute -inset-x-10 -inset-y-8 z-0 rounded-3xl bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
          )}
          <div className="relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`text-display text-4xl mb-6 ${featuresImg ? "text-white drop-shadow-lg" : "text-brand-text"}`}
          >
            Diferenciais que nos <span className="text-brand-orange">destacam</span>
          </motion.h2>
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: 80 }}
            viewport={{ once: true }}
            className="h-1 bg-gradient-to-r from-brand-orange to-brand-blue mx-auto rounded-full" 
          />
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`mt-8 max-w-2xl mx-auto leading-relaxed ${featuresImg ? "text-white/90 drop-shadow" : "text-brand-graphite"}`}
          >
            Combinamos tecnologia e experiência para oferecer a melhor solução em transporte veicular no mercado nacional.
          </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: feature.delay }}
            >
              <Card className={`p-8 border-none shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 group relative overflow-hidden h-full ${featuresImg ? "bg-white/85 backdrop-blur-sm hover:bg-white/95" : "bg-gray-50/50 hover:bg-white"}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className={`${feature.bg} ${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10`}>
                  <feature.icon size={28} />
                </div>
                
                <h3 className="text-lg font-bold text-brand-text mb-4 relative z-10">{feature.title}</h3>
                <p className="text-brand-graphite-light text-sm leading-relaxed relative z-10">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
