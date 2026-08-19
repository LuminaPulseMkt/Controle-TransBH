export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Solicite o Orçamento",
      description: "Preencha nosso formulário online ou fale via WhatsApp informando origem, destino e dados do veículo."
    },
    {
      number: "02",
      title: "Agende a Coleta",
      description: "Após aprovação da proposta, nossa equipe agenda o melhor horário para retirar o veículo com segurança."
    },
    {
      number: "03",
      title: "Entrega Garantida",
      description: "Acompanhe o transporte em tempo real até a chegada no destino final, com toda a documentação em ordem."
    }
  ];

  return (
    <section className="py-20 bg-brand-neutral overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-display text-4xl text-brand-text mb-4">Como Funciona</h2>
          <div className="w-20 h-1.5 bg-gradient-to-r from-brand-orange to-brand-blue mx-auto rounded-full" />
          <p className="text-brand-graphite mt-6">Seu veículo transportado em 3 passos simples.</p>
        </div>

        <div className="relative">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-brand-graphite/10 -translate-y-1/2" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-brand-orange text-display text-3xl shadow-xl border-4 border-brand-neutral mb-8">
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold text-brand-text mb-4">{step.title}</h3>
                <p className="text-brand-graphite max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
