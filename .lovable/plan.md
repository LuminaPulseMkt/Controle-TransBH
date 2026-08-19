# Plan - Landing Page TransBH

Implement a professional landing page for TransBH at the root route (`/`) to capture leads for vehicle transportation services.

## Technical Details

### 1. Database Schema
- Create `public.leads` table to store form submissions.
- Columns: `id`, `name`, `whatsapp`, `email`, `origin`, `destination`, `vehicle_type`, `vehicle_quantity`, `message`, `created_at`.
- Enable RLS: `anon` can INSERT; `authenticated` can SELECT/DELETE.

### 2. Route Restructuring
- Move existing dashboard logic from `src/routes/index.tsx` to `src/routes/dashboard.tsx`.
- Create new `src/routes/index.tsx` as the Landing Page entry point.

### 3. Landing Page Sections
- **Header**: Sticky navigation with logo, "Home", "Sobre", "Contato" links, and a "Solicitar Orçamento" CTA button.
- **Hero**: High-impact title, value proposition, and primary CTA.
- **Diferenciais**: Benefit cards (Real-time tracking, Insurance, Specialized fleet).
- **Como Funciona**: 3-step process visualization.
- **Sobre**: Institutional section about TransBH.
- **Contato**: Contact details, WhatsApp integration, and location info.
- **Formulário de Orçamento**: Comprehensive lead capture form with validation.
- **Footer**: Logo, quick links, and copyright info.

### 4. Design & UX
- Follow specified color palette: Laranja (#F5730C), Blue (#1FA8E0), Graphite (#4A4A4A).
- Responsive mobile-first design using Tailwind CSS.
- Smooth scroll navigation between sections.
- Form validation using `react-hook-form` and `zod`.
- Success notifications via `sonner`.

## User Review Required

> [!IMPORTANT]
> The current dashboard at `/` will be moved to `/dashboard`. Authenticated users will see a "Go to Dashboard" button on the landing page or can navigate directly to `/dashboard`. Is this acceptable?
