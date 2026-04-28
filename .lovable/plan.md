
# Reposicionar logo e carimbo no card

Ajustes pequenos em `src/routes/social.tsx`:

1. **Logo mais para o canto superior**
   - Mudar a posição do container da logo de `top: 16, right: 16` para `top: -8, right: -8`, "encostando" mais no canto.

2. **Carimbo mais central, com opacidade maior**
   - Tirar o posicionamento atual no canto inferior direito (`bottom: 70, right: 28`).
   - Centralizar no card: `top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-12deg)`.
   - Aumentar a opacidade do fundo do carimbo: `rgba(255, 252, 240, 0.92)` → `rgba(255, 252, 240, 0.98)` (quase sólido).
   - Tamanho, fonte, borda e estrelas permanecem iguais.

Sem outras mudanças.
