## Substituir "TransBH" pela logo na tela de login

### Mudanças em `src/routes/login.tsx`
1. Adicionar `import logo from "@/assets/logo-transbh.png"`.
2. Remover o quadrado amarelo com `Package2` e o `<h1>TransBH</h1>`.
3. Inserir `<img src={logo} alt="TransBH" className="h-20 w-auto object-contain mb-2" />`.
4. Manter o subtítulo "Gestão de Transporte de Veículos".
5. Remover import `Package2` (não usado).

### Resultado
Header do card de login passa a exibir apenas a logo (sem fundo) em tamanho legível, seguida do subtítulo.
