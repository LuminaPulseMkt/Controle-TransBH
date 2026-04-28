
# Logo e carimbo proporcionais (mobile e desktop)

O card é `aspect-square` (largura = altura), mas hoje a logo (`200px`) e o carimbo (`width: 220px`, `fontSize: 26px`) usam tamanhos fixos em pixels. Em telas pequenas, o card encolhe mas esses elementos não — ficam grandes demais e cortam. A solução é usar unidades relativas ao tamanho do card.

## Mudanças em `src/routes/social.tsx`

### 1. Container do card define tamanho de fonte base
No `<div ref={cardRef}>` adicionar `fontSize` proporcional via container query / cqw. Como o card é quadrado, usar `containerType: "size"` e basear medidas em `cqw` (1cqw = 1% da largura do card).

```tsx
<div
  ref={cardRef}
  className="w-full aspect-square relative"
  style={{ background: "#0b0b0b", containerType: "size" }}
>
```

### 2. Logo proporcional
Trocar `height: 200` fixo por `height: "28cqw"` (≈ 28% da largura do card). Em desktop com card de ~500px → ~140px; em mobile com card de ~350px → ~98px. Ajustar posição também em cqw para manter proporção:

```tsx
<div style={{ position: "absolute", top: "-2cqw", right: "-2cqw" }}>
  <img ... style={{ height: "28cqw", width: "auto", ... }} />
</div>
```

### 3. Carimbo proporcional
Substituir tamanhos fixos por cqw:
- `width: 220` → `width: "42cqw"`
- `fontSize: 26` → `fontSize: "5.5cqw"`
- `padding: "7px 14px"` → `padding: "1.4cqw 2.8cqw"`
- estrelas `fontSize: 9` → `fontSize: "2cqw"`
- `borderRadius: 8` → `borderRadius: "1.6cqw"`
- `border: "3px double"` mantém (fica fino, ok)

### 4. Rodapé com info também em cqw
Para coerência visual em mobile:
- `padding: "24px 20px 14px"` → `padding: "5cqw 4cqw 3cqw"`
- `fontSize: 14` → `fontSize: "2.8cqw"`
- placa/código `fontSize: 11` → `fontSize: "2.2cqw"`

### 5. Placeholder "sem foto" também escala
- Ícone Camera `size={36}` → manter (raro caso de uso)
- `fontSize: 11` → `fontSize: "2.2cqw"`

## Resultado esperado
A logo, carimbo e rodapé escalam junto com o card, mantendo a mesma proporção visual independente do tamanho da tela. A imagem PNG exportada por `html-to-image` continua nítida porque `pixelRatio: 2` é aplicado sobre o tamanho renderizado real.

Sem outras mudanças.
