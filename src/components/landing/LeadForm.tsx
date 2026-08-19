import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  whatsapp: z.string().min(10, "Informe um WhatsApp válido"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  origin: z.string().min(3, "Informe a cidade de origem"),
  destination: z.string().min(3, "Informe a cidade de destino"),
  vehicle_type: z.string().min(1, "Selecione o tipo de veículo"),
  vehicle_quantity: z.string().min(1, "Informe a quantidade"),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function LeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      whatsapp: "",
      email: "",
      origin: "",
      destination: "",
      vehicle_type: "carro",
      vehicle_quantity: "1",
      message: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: values.name,
        whatsapp: values.whatsapp,
        email: values.email || null,
        origin: values.origin,
        destination: values.destination,
        vehicle_type: values.vehicle_type,
        vehicle_quantity: parseInt(values.vehicle_quantity),
        message: values.message || null,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Solicitação enviada com sucesso!");
      form.reset();
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast.error("Ocorreu um erro ao enviar sua solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <section className="py-20 bg-brand-graphite text-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="bg-white/10 rounded-3xl p-12 backdrop-blur-sm border border-white/10 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand-orange/20">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-display text-4xl mb-4">Solicitação Recebida!</h2>
            <p className="text-xl text-gray-300 mb-8">
              Obrigado pelo seu interesse, <strong>{form.getValues("name")}</strong>. Nossa equipe comercial analisará seus dados e entrará em contato em breve via WhatsApp.
            </p>
            <Button 
              onClick={() => setIsSuccess(false)}
              className="bg-white text-brand-graphite hover:bg-gray-200 font-bold px-8 py-4 h-auto rounded-xl"
            >
              Fazer outra solicitação
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-brand-graphite text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,oklch(0.6_0.2_70/0.1),transparent_50%)]" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,oklch(0.6_0.2_230/0.1),transparent_50%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-display text-4xl mb-4">Solicite seu Orçamento</h2>
            <div className="w-20 h-1.5 bg-gradient-to-r from-brand-orange to-brand-blue mx-auto rounded-full mb-6" />
            <p className="text-gray-400">
              Preencha os campos abaixo para receber uma cotação personalizada para o seu transporte.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-brand-text">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} className="bg-brand-neutral border-none h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp / Telefone *</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} className="bg-brand-neutral border-none h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="exemplo@email.com" {...field} className="bg-brand-neutral border-none h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origem (Cidade/UF) *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Belo Horizonte/MG" {...field} className="bg-brand-neutral border-none h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destino (Cidade/UF) *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: São Paulo/SP" {...field} className="bg-brand-neutral border-none h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicle_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Veículo *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-brand-neutral border-none h-12">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="carro">Carro de passeio</SelectItem>
                              <SelectItem value="moto">Moto</SelectItem>
                              <SelectItem value="utilitario">Utilitário / Caminhonete</SelectItem>
                              <SelectItem value="frota">Frota / Múltiplos</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vehicle_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade *</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} className="bg-brand-neutral border-none h-12" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem / Observações (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Fale mais sobre sua necessidade..." 
                          className="bg-brand-neutral border-none min-h-[120px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-6 h-auto text-xl rounded-2xl shadow-xl shadow-brand-orange/20 transition-all hover:-translate-y-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitação de Orçamento"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
