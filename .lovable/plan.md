
# Ajustes no card de entrega

Pequenos ajustes visuais em `src/routes/social.tsx`:

1. **Logo maior e com fundo transparente**
   - Remover a "caixinha" branca atrás da logo (background, padding, borda arredondada e box-shadow do container).
   - Aumentar a altura da logo de **64px → 120px**.
   - Adicionar `drop-shadow` sutil na própria imagem para destacá-la sobre a foto, sem precisar de fundo.
   - A logo já está em PNG com fundo removido, então vai aparecer recortada sobre a colagem.

2. **Carimbo "ENTREGUE COM SUCESSO" um pouco menor**
   - Largura: **280px → 220px**.
   - Fonte: **36px → 26px**.
   - Padding interno reduzido: `10px 18px → 7px 14px`.
   - Borda dupla um pouco mais fina: `4px → 3px`.
   - Posição (canto inferior direito) e rotação (-12°) mantidas.

Sem mudanças em banco, sem mudanças em outras páginas.
