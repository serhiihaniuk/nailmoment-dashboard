# Finance Flow

Finance is owned by the `src/pages/finance` page slice on the client side and
by `src/app/api-routes/ticket/[id]/*` plus `src/app/api-routes/payments/*` on
the server side.

Reusable ticket/payment/domain calculations live in `src/entities/ticket`.

## Main Files

| Concern | Files |
| --- | --- |
| Finance page route | `app/(protected)/finance/page.tsx`, `src/pages/finance/index.ts` |
| Page shell/table | `src/pages/finance/ui/finance-page.tsx`, `finance-table.tsx` |
| Right-side editor | `src/pages/finance/ui/payments-panel.tsx` |
| Finance API client | `src/pages/finance/api/client.ts` |
| Autosave orchestration | `src/pages/finance/model/use-finance-autosave.ts` |
| Optimistic cache helpers | `src/pages/finance/model/finance-cache.ts` |
| Save status model | `src/pages/finance/model/autosave-status.ts` |
| Autosave ordering | `src/pages/finance/model/autosave-order.ts` |
| Discount options/input | `src/pages/finance/ui/discount-combobox.tsx`, `model/discount-options.ts` |
| Finance form schemas | `src/pages/finance/model/schemas.ts` |
| Domain totals | `src/entities/ticket/model/finance-summary.ts` |
| Discount resolver | `src/entities/ticket/model/finance-discount.ts` |
| Server finance route | `src/app/api-routes/ticket/[id]/finance/route.ts` |
| Server payment plan route | `src/app/api-routes/ticket/[id]/finance/payment-plan/route.ts` |
| Server ticket payments route | `src/app/api-routes/ticket/[id]/payments/route.ts` |
| Server payment item route | `src/app/api-routes/payments/[paymentId]/route.ts` |
| Payment Plan sync rules | `src/entities/ticket/model/payment-plan-sync.ts` |

## Load Flow

```txt
FinancePage
  |
  v
fetchTickets()
  |
  +- GET /api/ticket
  |
  v
src/app/api-routes/ticket/route.ts
  |
  +- auth check
  +- ticketService.getTickets({ archived: true })
       |
       +- read ticket rows
       +- read ticket_finance rows
       +- read payment_installment rows
       +- build finance_summary
  |
  v
parseTicketWithFinanceList(response.json())
  |
  v
React Query cache ["tickets"]
```

## Autosave Flow

```txt
User edits one field
  |
  v
useFinanceAutosave()
  |
  +- begin field version
  +- mark field saving
  +- cancel ["tickets"]
  +- snapshot previous tickets
  +- build rollback patch
  +- optimistic cache patch
  +- send mutation through API client
  |
  +- success:
  |    +- replace optimistic field/row with parsed server response
  |    +- mark saved briefly
  |    +- invalidate ["tickets"]
  |
  +- error:
       +- rollback changed field or previous tickets
       +- mark error with message
       +- invalidate ["tickets"] if latest
```

The autosave order model prevents stale responses from overwriting newer edits
for the same field.

Status states:

```txt
idle -> saving -> saved -> idle
idle -> saving -> error
```

## Optimistic Cache Rules

`src/pages/finance/model/finance-cache.ts` contains pure helpers that work on
parsed `TicketWithFinance[]`:

- `patchTicketInFinanceCache`
- `replaceTicketFieldsInFinanceCache`
- `patchTicketFinanceInCache`
- `replaceTicketFinanceInCache`
- `patchPaymentInFinanceCache`
- `replacePaymentInFinanceCache`
- `addPaymentToFinanceCache`
- `deletePaymentFromFinanceCache`
- `patchPaymentPlanInFinanceCache`

Every helper recalculates `finance_summary` after changes that affect totals,
payment status, invoice status, or due dates.

## Finance Formula

```txt
gross_total - discount_amount              = payableTotal
payableTotal - tax_amount                  = netTotal
sum(payment.amount where is_paid)          = paidTotal
payableTotal - paidTotal                   = remainingTotal
```

`tax_amount` is a legacy storage name. In the dashboard UI this is the
commission/fee adjustment. It reduces the net total received, but it does not
reduce the amount the customer owes.

The domain owner is:

```txt
src/entities/ticket/model/finance-summary.ts
```

## Discount Flow

```txt
User enters discount
  |
  v
DiscountCombobox
  |
  v
resolveFinanceDiscountInput(input, grossTotal)
  |
  +- ""       -> amount 0.00
  +- "100"    -> amount 100.00
  +- "10%"    -> grossTotal * 10%
  +- invalid  -> field error
  |
  v
saveFinance(ticketId, { discount_amount })
```

Important storage rule:

```txt
ticket_finance.discount_amount stores an amount, not a percent.
```

Curated options currently live in `src/pages/finance/model/discount-options.ts`:

```txt
100.00
10% Dishop
```

## Payment Plan Sync

Client call:

```txt
syncTicketPaymentPlan(ticketId, paymentPlan)
  -> PATCH /api/ticket/:id/finance/payment-plan
```

Server flow:

```txt
PATCH /api/ticket/:id/finance/payment-plan
  |
  +- auth check
  +- parse ticket id
  +- parse payment_plan
  +- load hydrated ticket
  +- build Payment Plan sync through src/entities/ticket
  |
  +- custom:
  |    update only payment_plan
  |
  +- free/sponsor:
  |    zero finance totals
  |    delete unpaid payments
  |
  +- full/two_parts/three_parts:
       update payment_plan
       calculate remaining payable after paid payments
       keep paid payments
       delete excess unpaid payments
       renumber remaining payments
       split remaining amount across unpaid payments
       create missing unpaid payments
  |
  v
return full hydrated TicketWithFinance
```

The sync rule is shared in the Ticket entity layer. The server route applies
the database writes, and Finance Autosave uses the same rule for optimistic
cache projection instead of coordinating separate create/update/delete calls.

## Payment Edit Guards

`PATCH /api/payments/:paymentId` and `DELETE /api/payments/:paymentId` guard
payments before updating.

Stripe-origin payment detection:

```txt
ticket.stripe_event_id does not start with "manual"
and payment.installment_number === 1
```

Stripe-origin payment rules:

- cannot be deleted;
- only `invoice_status` and `invoice_number` can be edited.

Paid payment delete rule:

- paid payments cannot be deleted.

## Tests

Focused tests:

- `src/pages/finance/model/finance-cache.test.ts`
- `src/pages/finance/model/autosave-order.test.ts`
- `src/pages/finance/model/discount-options.test.ts`
- `src/pages/finance/model/utils.test.ts`
- `src/pages/finance/api/client.test.ts`
- `src/entities/ticket/model/finance-summary.test.ts`
- `src/entities/ticket/model/finance-discount.test.ts`

Useful command:

```bash
npm test -- finance
```
