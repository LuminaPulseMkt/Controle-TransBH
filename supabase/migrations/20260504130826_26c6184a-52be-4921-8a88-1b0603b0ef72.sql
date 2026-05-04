INSERT INTO public.message_templates (key, label, body) VALUES
('contract_clauses_default', 'Contrato — Cláusulas padrão',
'1. OBJETO
A CONTRATADA compromete-se a transportar o veículo descrito neste contrato da origem até o destino indicados, com zelo e segurança.

2. PAGAMENTO
2.1. Valor total: {amount}.
2.2. Forma de pagamento: 50% na coleta e 50% na entrega, salvo acordo diferente registrado por escrito.
2.3. O atraso no pagamento implica multa de 2% e juros de 1% ao mês.

3. SEGURO E RESPONSABILIDADE PELA CARGA
3.1. O veículo viaja coberto por seguro de transporte contra colisão, tombamento, incêndio e roubo durante todo o trajeto.
3.2. Em caso de sinistro, a CONTRATADA acionará o seguro e manterá o CONTRATANTE informado em até 24h.
3.3. Não estão cobertos: itens pessoais deixados no veículo, danos pré-existentes não registrados na vistoria e avarias mecânicas internas não decorrentes do transporte.

4. PRAZO DE ENTREGA
4.1. Prazo estimado: até {due_date}.
4.2. Atrasos por caso fortuito, força maior, condições climáticas extremas ou bloqueios de via não geram multa.
4.3. Atraso superior a 5 dias úteis por culpa exclusiva da CONTRATADA gera desconto de 5% sobre o frete.

5. VISTORIA
5.1. Vistoria fotográfica detalhada será feita na coleta e na entrega.
5.2. Eventuais avarias devem ser apontadas no ato da entrega; após a assinatura do termo, presume-se que o veículo foi entregue íntegro.

6. OBRIGAÇÕES DO CONTRATANTE
6.1. Apresentar documentação do veículo em dia.
6.2. Garantir que o veículo esteja com combustível suficiente para manobra (mínimo 1/4 do tanque) e em condições de rodar curtas distâncias.

7. RESCISÃO
Em caso de cancelamento pelo CONTRATANTE após a coleta, será cobrada taxa proporcional ao trajeto já percorrido.

8. FORO
Fica eleito o foro da comarca da sede da CONTRATADA para dirimir quaisquer questões deste contrato.')
ON CONFLICT (key) DO NOTHING;