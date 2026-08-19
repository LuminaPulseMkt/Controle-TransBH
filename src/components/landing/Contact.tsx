import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";

export function Contact() {
  const contactInfo = [
    {
      icon: Phone,
      label: "Telefone / WhatsApp",
      value: "(31) 99999-9999",
      href: "https://wa.me/5531999999999"
    },
    {
      icon: Mail,
      label: "E-mail",
      value: "contato@transbh.com.br",
      href: "mailto:contato@transbh.com.br"
    },
    {
      icon: MapPin,
      label: "Região de Atuação",
      value: "Todo o Brasil - Sede em Belo Horizonte/MG",
      href: "#"
    }
  ];

  return (
    <section className="py-20 bg-brand-neutral">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-1/2 p-10 lg:p-16">
              <h2 className="text-display text-4xl text-brand-text mb-6">Entre em Contato</h2>
              <p className="text-brand-graphite mb-10">
                Estamos prontos para atender você. Escolha o canal de sua preferência ou preencha o formulário para um orçamento detalhado.
              </p>
              
              <div className="space-y-8">
                {contactInfo.map((info, idx) => (
                  <a 
                    key={idx} 
                    href={info.href} 
                    className="flex items-start gap-5 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-neutral flex items-center justify-center text-brand-graphite group-hover:bg-brand-orange group-hover:text-white transition-all">
                      <info.icon size={24} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-brand-graphite-light font-bold mb-1">{info.label}</div>
                      <div className="text-lg font-bold text-brand-text group-hover:text-brand-orange transition-colors">{info.value}</div>
                    </div>
                  </a>
                ))}
              </div>
              
              <div className="mt-12 flex items-center gap-4">
                <span className="text-sm font-bold text-brand-graphite-light uppercase tracking-widest">Siga-nos:</span>
                <a href="#" className="w-10 h-10 rounded-full bg-brand-neutral flex items-center justify-center text-brand-graphite hover:bg-brand-blue hover:text-white transition-all">
                  <Instagram size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-brand-neutral flex items-center justify-center text-brand-graphite hover:bg-brand-blue hover:text-white transition-all">
                  <Facebook size={20} />
                </a>
              </div>
            </div>
            
            <div className="lg:w-1/2 bg-brand-graphite p-10 lg:p-16 text-white relative overflow-hidden">
               <div className="relative z-10 h-full flex flex-col justify-center">
                  <h3 className="text-display text-3xl mb-6">Atendimento Prioritário</h3>
                  <p className="text-gray-400 mb-8 max-w-sm">
                    Precisa de uma cotação urgente? Clique no botão abaixo e fale agora mesmo com um de nossos consultores logísticos pelo WhatsApp.
                  </p>
                  <a 
                    href="https://wa.me/5531999999999" 
                    className="inline-flex items-center justify-center gap-3 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-5 px-8 rounded-2xl text-xl shadow-xl shadow-brand-orange/20 transition-all hover:-translate-y-1 w-full sm:w-auto text-center"
                  >
                    <Phone size={24} />
                    Falar via WhatsApp
                  </a>
               </div>
               
               {/* Decorative background logo */}
               <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
                  <svg width="400" height="400" viewBox="0 0 100 100">
                     <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="2" fill="none" />
                     <path d="M30 50 L70 50 M50 30 L50 70" stroke="white" strokeWidth="2" />
                  </svg>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
