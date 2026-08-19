export function About() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="relative">
              <div className="bg-brand-blue/10 rounded-3xl p-10 lg:p-16">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                       <div className="h-40 bg-brand-graphite/20 rounded-2xl animate-pulse" />
                       <div className="h-24 bg-brand-orange/20 rounded-2xl animate-pulse" />
                    </div>
                    <div className="space-y-4 pt-8">
                       <div className="h-24 bg-brand-blue/20 rounded-2xl animate-pulse" />
                       <div className="h-40 bg-brand-graphite/20 rounded-2xl animate-pulse" />
                    </div>
                 </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-6 -right-6 bg-brand-orange text-white p-6 rounded-2xl shadow-xl">
                 <div className="text-display text-4xl leading-none">10+</div>
                 <div className="text-xs uppercase tracking-widest mt-1">Anos de Mercado</div>
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/2">
            <h2 className="text-display text-4xl text-brand-text mb-6">Excelência em Soluções Logísticas</h2>
            <div className="w-20 h-1.5 bg-gradient-to-r from-brand-orange to-brand-blue mb-8 rounded-full" />
            
            <div className="space-y-6 text-brand-graphite leading-relaxed">
              <p>
                A <strong>TransBH</strong> nasceu da necessidade de um mercado carente de pontualidade e transparência no transporte de veículos. Com sede estratégica e atuação em todo o território nacional, nos consolidamos como referência em logística automotiva.
              </p>
              <p>
                Nossa missão é proporcionar tranquilidade absoluta aos nossos clientes, tratando cada veículo com o cuidado e a precisão que ele merece. Seja para particulares, concessionárias ou grandes frotistas, entregamos resultados sólidos.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-brand-blue" />
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-text">Abrangência Nacional</h4>
                    <p className="text-sm">Coletamos e entregamos em qualquer cidade brasileira.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-orange/10 flex items-center justify-center shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-brand-orange" />
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-text">Foco no Cliente</h4>
                    <p className="text-sm">Atendimento personalizado e suporte dedicado.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
