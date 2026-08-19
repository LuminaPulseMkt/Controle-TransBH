import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
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

  const navItems = [
    { label: "Home", href: "home" },
    { label: "Sobre", href: "sobre" },
    { label: "Contato", href: "contato" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white shadow-md py-2" : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <BrandLogo size="md" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => scrollToSection(item.href)}
              className="text-brand-text hover:text-brand-orange font-medium transition-colors"
            >
              {item.label}
            </button>
          ))}
          {user && (
            <Link 
              to="/dashboard" 
              className="text-brand-text hover:text-brand-orange font-medium transition-colors"
            >
              Dashboard
            </Link>
          )}
          <Button
            onClick={() => scrollToSection("orcamento")}
            className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
          >
            Solicitar Orçamento
          </Button>
          {!user && (
            <Button asChild variant="ghost" className="text-brand-graphite">
              <Link to="/login">Login</Link>
            </Button>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-brand-text p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute top-full left-0 right-0 shadow-lg p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-5">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => scrollToSection(item.href)}
              className="text-brand-text hover:text-brand-orange font-medium text-left py-2"
            >
              {item.label}
            </button>
          ))}
          {user && (
            <Link 
              to="/dashboard" 
              className="text-brand-text hover:text-brand-orange font-medium py-2"
            >
              Dashboard
            </Link>
          )}
          <Button
            onClick={() => scrollToSection("orcamento")}
            className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold w-full"
          >
            Solicitar Orçamento
          </Button>
          {!user && (
            <Button asChild variant="ghost" className="text-brand-graphite w-full justify-start">
              <Link to="/login">Login Colaborador</Link>
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
