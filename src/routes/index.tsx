import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { About } from "@/components/landing/About";
import { Contact } from "@/components/landing/Contact";
import { LeadForm } from "@/components/landing/LeadForm";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-text">
      <Header />
      <main>
        <div id="home">
          <Hero />
        </div>
        <Features />
        <HowItWorks />
        <div id="sobre">
          <About />
        </div>
        <div id="contato">
          <Contact />
        </div>
        <div id="orcamento">
          <LeadForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
