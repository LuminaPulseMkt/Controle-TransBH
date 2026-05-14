## Ajuste do logo/nome "TransBH" no card de entrega

**Problema atual** (em `src/routes/social.tsx`, bloco do `cardRef`):
- O logo/texto está posicionado com `top: -2cqw` e `right: -2cqw`, ou seja, deslocado para fora do card (sai do "esquadro").
- Quando não há logo, o texto "TransBH" usa `fontSize: 10cqw` — grande demais e também cortado pelo offset negativo.
- Resultado: o nome aparece desalinhado / parcialmente fora do quadro branco da colagem.

**Ajuste proposto** (apenas CSS inline do bloco do logo, sem mexer em lógica):

1. Trazer o container para dentro do card:
   - `top: 3cqw` e `right: 3cqw` (margem interna consistente).
2. Reduzir o tamanho:
   - Logo (imagem): `height: 14cqw` (antes 28cqw — metade, fica proporcional ao card).
   - Texto fallback "TransBH": `fontSize: 6.5cqw`, mantendo `Bebas Neue` e `letterSpacing: 2`.
3. Manter a sombra (`drop-shadow` / `textShadow`) para legibilidade sobre fotos claras.
4. Garantir alinhamento à direita do bloco caso o logo seja largo: `display: flex; justify-content: flex-end;` no container.

**Escopo**
- Único arquivo tocado: `src/routes/social.tsx`, somente o bloco "Logo - canto superior direito".
- Sem mudanças no carimbo central, rodapé, colagem 2x2, ou em qualquer lógica de seleção/foto.

**Como validar**
- Abrir `/social`, escolher uma entrega com fotos, conferir que o logo/nome fica totalmente dentro do card, alinhado ao canto superior direito com respiro de ~3cqw das bordas, e em tamanho equilibrado em relação ao carimbo central.
