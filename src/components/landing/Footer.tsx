import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
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
    <footer className="bg-white border-t border-gray-100 py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          <div className="max-w-sm">
            <BrandLogo size="md" className="mb-6" />
            <p className="text-brand-graphite text-sm leading-relaxed">
              Referência nacional em transporte de veículos com segurança, agilidade e transparência. Sua carga em boas mãos.
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 w-full md:w-auto">
            <div>
              <h4 className="font-bold text-brand-text mb-4 uppercase text-xs tracking-widest">Links Rápidos</h4>
              <ul className="space-y-3 text-sm text-brand-graphite">
                <li><button onClick={() => scrollToSection("home")} className="hover:text-brand-orange transition-colors">Home</button></li>
                <li><button onClick={() => scrollToSection("sobre")} className="hover:text-brand-orange transition-colors">Sobre</button></li>
                <li><button onClick={() => scrollToSection("contato")} className="hover:text-brand-orange transition-colors">Contato</button></li>
                <li><button onClick={() => scrollToSection("orcamento")} className="hover:text-brand-orange transition-colors">Orçamento</button></li>
              </ul>
            </div>
            
            <div className="col-span-2 sm:col-span-2">
              <h4 className="font-bold text-brand-text mb-4 uppercase text-xs tracking-widest">Contato</h4>
              <ul className="space-y-3 text-sm text-brand-graphite">
                <li>Belo Horizonte - MG</li>
                <li>(31) 97152-3294</li>
                <li>transbhtransportes@gmail.com</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-brand-graphite-light">
          <p>© {currentYear} TransBH – Transportes de Veículos. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-brand-orange">Política de Privacidade</a>
            <a href="#" className="hover:text-brand-orange">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
