# Plan: Trip Sheet Enhancements

Implement visual and functional updates to the "Planilha" (Trip Sheet) feature as requested.

## Database Changes
- Migration to add `return_date` (DATE) and `expenses` (JSONB) columns to `trip_sheets` table.

## Data Structure Changes (`src/lib/trip-sheet-types.ts`)
- Rename `pagamento` to `valor` in `TripRow`.
- Add `pago` (boolean) and `recebido_por` (string) to `TripRow`.
- Add `ExpenseRow` interface.
- Add `return_date` and `expenses` to `TripSheetData`.

## UI Changes (`src/routes/planilhas.tsx`)
- **Editor**:
    - Add "Data da volta" input.
    - Update IDA/VOLTA tables:
        - Rename column "Pagamento" to "Valor".
        - Add "Pago" checkbox column.
        - Add "Recebido por" input column.
    - Add "Despesas" section with add/remove rows.
    - Add a "Totais" section at the bottom calculating:
        - Total Recebido (sum of `valor` where `pago` is true or all? Assuming all received/confirmed amounts).
        - Total Gasto (sum of expenses).
        - Valor Total Livre (Net).
- **Listing**:
    - Update CSV export logic.
    - Ensure new fields are fetched and saved.

## PDF Export Changes (`src/lib/trip-sheet-pdf.ts`)
- Reflect renamed and new columns in the PDF tables.
- Include "Data da Volta".
- Add the "Despesas" section and the totals summary at the end of the document.

## User Questions
- Should "Total Recebido" sum ALL row values or only those marked as "Pago"?
- Is there a specific format for the "Despesas" section in the PDF?
