## Substituir "TransBH" pela logo no sidebar

### Passos
1. Copiar a imagem enviada para `src/assets/logo-transbh.png`.
2. Editar `src/components/AppSidebar.tsx`:
   - Importar: `import logo from "@/assets/logo-transbh.png"`
   - Remover o quadrado amarelo com `Package2` e o texto "TransBH".
   - Renderizar `<img src={logo} alt="TransBH" className="h-10 w-auto object-contain" />` quando expandido e `h-7 w-auto` quando colapsado.
   - Manter abaixo o subtítulo "Administrador / Colaborador" apenas quando expandido.
   - Remover import não usado de `Package2`.

### Detalhes
- A logo já tem o caminhão + "TRANSBH / TRANSPORTES DE VEÍCULOS", então não é preciso texto adicional ao lado.
- Tamanhos escolhidos garantem leitura sem estourar a altura do header do sidebar.
