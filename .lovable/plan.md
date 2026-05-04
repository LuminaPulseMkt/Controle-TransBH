## Substituir "TransBH" pela logo no sidebar

### O que fazer
1. Salvar a logo enviada em `src/assets/logo.png` (PNG sem fundo).
2. Editar `src/components/AppSidebar.tsx`:
   - Importar a logo: `import logo from "@/assets/logo.png"`
   - Remover o quadrado amarelo com o ícone `Package2` e o texto `TransBH`.
   - Renderizar `<img src={logo} alt="TransBH" />` com altura legível (~40px quando expandido, ~28px quando colapsado).
   - Manter o subtítulo "Administrador / Colaborador" ao lado quando expandido (ou remover se preferir somente a logo — confirmar).

### Detalhes técnicos
- Header do sidebar fica com fundo escuro (sidebar navy), então a logo precisa ter contraste claro — PNG transparente com traços claros funciona bem.
- Tamanhos: `h-10 w-auto` expandido, `h-7 w-auto` colapsado, com `object-contain` para preservar proporção.
- Remover o import de `Package2` do lucide-react.

### Pendência
Aguardando o anexo da imagem da logo (não veio nesta mensagem).
