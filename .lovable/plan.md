# Plano de Modernização e Gerenciador de Imagens - TransBH

Implementação de um redesign moderno para a landing page e um sistema administrativo de gerenciamento de imagens via Supabase.

## Parte 1: Redesign da Landing Page

- **Estilos Globais**: Atualizar `src/styles.css` com novos gradientes, texturas sutis e classes de animação.
- **Componentes de Landing**:
    - `Header.tsx`: Adicionar efeito glassmorphism e compactar botões.
    - `Hero.tsx`: Implementar título com gradiente, botões compactos e badges/contadores dinâmicos.
    - `Features.tsx`: Atualizar cards com efeitos de hover e ícones em gradiente.
    - `HowItWorks.tsx`: Adicionar linha conectora animada e passos estilizados.
    - `LeadForm.tsx`: Redesenhar como card flutuante com foco azul e botões elegantes.
    - `About.tsx` & `Contact.tsx`: Aumentar whitespace e refinamento visual.
- **Interatividade**: Integrar `framer-motion` para animações de entrada (scroll reveal).

## Parte 2: Gerenciador de Imagens (Admin)

- **Banco de Dados**:
    - Criar tabela `public.site_settings` para armazenar URLs das imagens por chave.
    - Habilitar RLS e permissões para admins.
    - Criar bucket `site-images` no Supabase Storage.
- **Nova Rota Admin**:
    - Criar `src/routes/site-images.tsx` para gerenciamento das imagens.
    - Adicionar item "Imagens do Site" na `AppSidebar.tsx`.
- **Funcionalidades**:
    - Listagem de espaços configuráveis (Hero, Sobre, Diferenciais, Orçamento).
    - Upload com preview instantâneo e validação de tamanho/tipo.
    - Persistência no Storage e registro na tabela de configurações.
- **Integração Frontend**: Atualizar componentes da landing para consumir imagens dinâmicas via hook, mantendo fallbacks estáticos.

## Detalhes Técnicos

- **Cores**: Laranja #F5730C, Azul #1FA8E0.
- **Bibliotecas**: `framer-motion` para animações, `lucide-react` para ícones.
- **Segurança**: RLS para garantir que apenas admins gerenciem as imagens do site.
