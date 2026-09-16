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
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/lib/use-site-settings";

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
  const { getSetting } = useSiteSettings();
  const formBg = getSetting("lead_form_bg");

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
      <section className="py-24 bg-brand-text text-white">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 rounded-[2rem] p-12 backdrop-blur-md border border-white/10"
          >
            <div className="w-20 h-20 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand-orange/20">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h2 className="text-display text-4xl mb-6">Solicitação Recebida!</h2>
            <p className="text-lg text-gray-400 mb-10 leading-relaxed">
              Obrigado pelo contato, <strong>{form.getValues("name")}</strong>. Nossa equipe comercial analisará seus dados e retornará via WhatsApp o mais breve possível.
            </p>
            <Button 
              onClick={() => setIsSuccess(false)}
              className="bg-white text-brand-text hover:bg-gray-100 font-bold px-10 py-4 h-auto rounded-full transition-all"
            >
              Realizar Nova Consulta
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="orcamento" className="py-24 text-white relative overflow-hidden">
      {formBg ? (
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-95"
          style={{
            backgroundImage: `url(${formBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-brand-blue via-brand-text to-brand-orange opacity-90" />
      )}

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 mx-auto max-w-2xl rounded-[2rem] bg-black/45 backdrop-blur-sm px-6 py-10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-display text-4xl mb-6"
            >
              Peça sua <span className="text-brand-orange">cotação</span> grátis
            </motion.h2>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              className="h-1 bg-gradient-to-r from-brand-orange to-brand-blue mx-auto rounded-full mb-8" 
            />
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 max-w-xl mx-auto"
            >
              Resposta rápida e personalizada. Preencha os detalhes e nossa equipe cuidará do resto.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-[2.5rem] p-8 md:p-14 shadow-2xl text-brand-text border border-white/20"
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Como podemos te chamar?" {...field} className="bg-gray-50 border-gray-100 h-14 rounded-xl focus-visible:ring-brand-blue" />
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} className="bg-gray-50 border-gray-100 h-14 rounded-xl focus-visible:ring-brand-blue" />
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="contato@exemplo.com" {...field} className="bg-gray-50 border-gray-100 h-14 rounded-xl focus-visible:ring-brand-blue" />
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Origem</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade / Estado" {...field} className="bg-gray-50 border-gray-100 h-14 rounded-xl focus-visible:ring-brand-blue" />
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Destino</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade / Estado" {...field} className="bg-gray-50 border-gray-100 h-14 rounded-xl focus-visible:ring-brand-blue" />
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-50 border-gray-100 h-14 rounded-xl focus:ring-brand-blue">
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="carro">Carro</SelectItem>
                              <SelectItem value="moto">Moto</SelectItem>
                              <SelectItem value="utilitario">Utilitário</SelectItem>
                              <SelectItem value="frota">Frota</SelectItem>
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Qtd</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} className="bg-gray-50 border-gray-100 h-14 rounded-xl focus-visible:ring-brand-blue" />
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
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mensagem (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Alguma observação especial?" 
                          className="bg-gray-50 border-gray-100 min-h-[120px] rounded-xl focus-visible:ring-brand-blue" 
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
                  className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-6 h-auto text-lg rounded-2xl shadow-2xl shadow-brand-orange/20 transition-all hover:-translate-y-1 group"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      Enviar agora
                      <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
