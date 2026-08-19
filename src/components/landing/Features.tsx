import { ShieldCheck, MapPin, Truck, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

export function Features() {
  const features = [
    {
      title: "Rastreamento em Tempo Real",
      description: "Saiba exatamente onde seu veículo está durante todo o trajeto com nosso sistema de geolocalização.",
      icon: MapPin,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
    {
      title: "Seguro Total da Carga",
      description: "Tranquilidade garantida com cobertura securitária completa contra qualquer eventualidade.",
      icon: ShieldCheck,
      color: "text-brand-orange",
      bg: "bg-brand-orange/10",
    },
    {
      title: "Frota Própria e Especializada",
      description: "Cegonheiras modernas e motoristas treinados para manuseio seguro de veículos de todos os portes.",
      icon: Truck,
      color: "text-brand-graphite",
      bg: "bg-brand-graphite/10",
    },
    {
      title: "Atendimento via WhatsApp",
      description: "Comunicação direta e ágil. Tire suas dúvidas e receba atualizações rapidamente pelo seu celular.",
      icon: MessageSquare,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-display text-4xl text-brand-text mb-4">Por que escolher a TransBH?</h2>
          <div className="w-20 h-1.5 bg-gradient-to-r from-brand-orange to-brand-blue mx-auto rounded-full" />
          <p className="text-brand-graphite mt-6 max-w-2xl mx-auto">
            Combinamos tecnologia e experiência para oferecer a melhor solução em transporte veicular no mercado nacional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <Card key={idx} className="p-8 border-none shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 group">
              <div className={`${feature.bg} ${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon size={32} />
              </div>
              <h3 className="text-xl font-bold text-brand-text mb-4">{feature.title}</h3>
              <p className="text-brand-graphite-light text-sm leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
