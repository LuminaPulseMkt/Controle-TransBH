import { motion } from "framer-motion";
import { ClipboardList, Truck, CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: ClipboardList,
      title: "Solicite o Orçamento",
      description: "Preencha nosso formulário online ou fale via WhatsApp informando origem, destino e dados do veículo.",
      delay: 0.1
    },
    {
      number: "02",
      icon: Truck,
      title: "Agende a Coleta",
      description: "Após aprovação da proposta, nossa equipe agenda o melhor horário para retirar o veículo com segurança.",
      delay: 0.2
    },
    {
      number: "03",
      icon: CheckCircle2,
      title: "Entrega Garantida",
      description: "Acompanhe o transporte em tempo real até a chegada no destino final, com toda a documentação em ordem.",
      delay: 0.3
    }
  ];

  return (
    <section className="py-24 bg-brand-neutral overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-display text-4xl text-brand-text mb-6"
          >
            Seu veículo em boas <span className="text-brand-blue">mãos</span>
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
            className="text-brand-graphite mt-8"
          >
            Processo simplificado e transparente do início ao fim.
          </motion.p>
        </div>

        <div className="relative">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-brand-orange/20 via-brand-blue/20 to-brand-orange/20 -translate-y-[100px]" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative z-10">
            {steps.map((step, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: step.delay }}
                className="flex flex-col items-center text-center group"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-brand-orange shadow-xl border border-gray-100 group-hover:border-brand-orange/30 group-hover:rotate-6 transition-all duration-300">
                    <step.icon size={40} className="group-hover:-rotate-6 transition-transform" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-brand-text text-white rounded-full flex items-center justify-center font-display text-sm border-4 border-brand-neutral">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-brand-text mb-4">{step.title}</h3>
                <p className="text-brand-graphite max-w-xs text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
