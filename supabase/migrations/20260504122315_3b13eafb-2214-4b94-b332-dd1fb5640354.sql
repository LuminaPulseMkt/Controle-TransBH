-- Ensure unique key for upserts
CREATE UNIQUE INDEX IF NOT EXISTS message_templates_key_uniq ON public.message_templates(key);

INSERT INTO public.message_templates (key, label, body) VALUES
('wa_budget_created', 'WhatsApp — Orçamento enviado',
 'Olá {client_name}! Segue o link do seu orçamento {company_name}: {link}'),
('wa_budget_accepted', 'WhatsApp — Aceite recebido',
 'Olá {client_name}! Recebemos seu aceite do orçamento "{title}".' || E'\n' ||
 'Contrato: {link}' || E'\n' ||
 'Valor: {amount} — vencimento {due_date}.' || E'\n' ||
 'Obrigado por confiar na {company_name}!'),
('wa_charge_reminder', 'WhatsApp — Cobrança',
 'Olá {client_name}! Lembrete da cobrança {company_name}:' || E'\n' ||
 'Valor: {amount} — vencimento {due_date}.' || E'\n' ||
 'Em caso de dúvida, fale conosco.'),
('email_budget_created', 'E-mail — Orçamento enviado',
 'Seu orçamento {company_name}' || E'\n---\n' ||
 'Olá {client_name},' || E'\n\n' ||
 'Segue o link do seu orçamento: {link}' || E'\n\n' ||
 'Qualquer dúvida estamos à disposição.' || E'\n' ||
 'Equipe {company_name}'),
('email_budget_accepted', 'E-mail — Aceite confirmado',
 'Aceite confirmado — {title}' || E'\n---\n' ||
 'Olá {client_name},' || E'\n\n' ||
 'Recebemos seu aceite do orçamento "{title}".' || E'\n' ||
 'Contrato: {link}' || E'\n' ||
 'Valor: {amount} — vencimento {due_date}.' || E'\n\n' ||
 'Obrigado por confiar na {company_name}!'),
('email_charge_reminder', 'E-mail — Cobrança',
 'Lembrete de cobrança — {company_name}' || E'\n---\n' ||
 'Olá {client_name},' || E'\n\n' ||
 'Este é um lembrete da cobrança no valor de {amount} com vencimento em {due_date}.' || E'\n\n' ||
 'Em caso de dúvida, fale conosco.' || E'\n' ||
 'Equipe {company_name}')
ON CONFLICT (key) DO NOTHING;