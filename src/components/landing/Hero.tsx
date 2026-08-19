import { Button } from "@/components/ui/button";

export function Hero() {
  const scrollToOrcamento = () => {
    const element = document.getElementById("orcamento");
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-brand-neutral">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-display text-4xl md:text-7xl text-brand-text mb-6 leading-tight animate-in fade-in slide-in-from-bottom-5 duration-700">
            Transporte de Veículos com <span className="text-brand-orange">Segurança</span> e <span className="text-brand-blue">Agilidade</span> em Todo o Brasil
          </h1>
          <p className="text-lg md:text-xl text-brand-graphite mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            Especialistas no transporte de carros, motos, frotas e veículos seminovos. 
            Sua carga protegida com seguro total e rastreamento em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
            <Button
              onClick={scrollToOrcamento}
              size="lg"
              className="bg-brand-orange hover:bg-brand-orange-dark text-white text-lg px-8 py-6 h-auto font-bold rounded-xl shadow-lg shadow-brand-orange/20 transition-all hover:-translate-y-1"
            >
              Solicitar Orçamento Gratuito
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
              className="border-brand-graphite text-brand-graphite hover:bg-brand-graphite hover:text-white text-lg px-8 py-6 h-auto font-bold rounded-xl transition-all"
            >
              Conhecer a TransBH
            </Button>
          </div>
        </div>

        {/* Truck Illustration/Icon replacement for photo */}
        <div className="mt-16 md:mt-24 relative max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-brand-graphite to-brand-text rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
             {/* Simple geometric representation of a transport truck */}
             <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                <div className="text-white space-y-4 max-w-sm">
                   <h3 className="text-display text-3xl">Logística de Ponta</h3>
                   <p className="text-gray-300">Nossa frota é equipada com o que há de mais moderno em amarração e proteção veicular.</p>
                   <div className="flex gap-4">
                      <div className="bg-brand-orange/20 border border-brand-orange/30 rounded-lg p-3 text-brand-orange text-center">
                         <div className="text-xl font-bold">100%</div>
                         <div className="text-[10px] uppercase tracking-wider">Seguro</div>
                      </div>
                      <div className="bg-brand-blue/20 border border-brand-blue/30 rounded-lg p-3 text-brand-blue text-center">
                         <div className="text-xl font-bold">24h</div>
                         <div className="text-[10px] uppercase tracking-wider">Rastreio</div>
                      </div>
                   </div>
                </div>
                <div className="w-full md:w-1/2 flex items-center justify-center">
                   {/* This would ideally be an image, but we use a stylized icon-like structure */}
                   <div className="relative w-full aspect-video bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
                      <div className="text-brand-orange opacity-40">
                         <svg width="200" height="100" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="10" y="40" width="140" height="40" rx="4" fill="currentColor" />
                            <rect x="150" y="50" width="40" height="30" rx="4" fill="currentColor" />
                            <circle cx="30" cy="85" r="10" fill="currentColor" />
                            <circle cx="120" cy="85" r="10" fill="currentColor" />
                            <circle cx="170" cy="85" r="10" fill="currentColor" />
                            <rect x="20" y="20" width="120" height="15" rx="2" fill="currentColor" opacity="0.5" />
                         </svg>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <span className="text-white font-display text-4xl tracking-widest opacity-20">TRANSBH</span>
                      </div>
                   </div>
                </div>
             </div>
             {/* Decorative lines */}
             <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-blue/10 to-transparent pointer-events-none" />
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-brand-blue to-brand-orange opacity-30" />
          </div>
        </div>
      </div>
    </section>
  );
}
