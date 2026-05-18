## Objetivo
Adicionar botão de visibilidade (olho) nos campos de senha da tela de login, nas abas "Entrar" e "Criar conta".

## Alteração
No arquivo `src/routes/login.tsx`:
1. Adicionar estado `showPassword` (boolean).
2. Importar ícones `Eye` e `EyeOff` do `lucide-react`.
3. Envolver cada `<Input type="password" />` em um container `relative` com um botão `absolute` à direita para alternar o tipo entre `password` e `text`.
4. Aplicar nas duas abas: senha de login (`id="password"`) e senha de cadastro (`id="password2"`).

## Critérios de aceitação
- Ícone de olho visível ao lado direito dentro do campo de senha.
- Clique alterna entre texto visível e oculto.
- Estilo consistente com o design system atual (cores, bordas, tamanho do ícone).