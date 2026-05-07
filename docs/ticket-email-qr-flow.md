# Ticket, Email, QR, And Preview Flow

This doc covers manual ticket creation, QR code generation, Resend email
delivery, and ticket email/PDF preview paths.

Stripe-created regular tickets use the same QR/email helpers, but the entry
point is the Stripe webhook. See [stripe-flow.md](stripe-flow.md).

## Main Files

| Concern | Files |
| --- | --- |
| Manual ticket API | `src/app/api-routes/ticket/route.ts` |
| Ticket detail API | `src/app/api-routes/ticket/[id]/route.ts` |
| Ticket DB service | `src/shared/db/service/ticket-service.ts` |
| Ticket Delivery orchestration | `src/app/ticket-delivery/*` |
| QR + email helpers | `src/shared/email/send-email.ts` |
| Ticket email template | `src/shared/email/email-template.tsx` |
| Battle email template | `src/shared/email/battle-email-template.tsx` |
| Custom email template | `src/shared/email/custom-email-template.tsx` |
| Ticket preview API | `src/app/api-routes/pdf/[id]/route.tsx` |
| Preview server actions | `src/pages/pdf-ticket-preview/api/email-preview.ts` |
| Ticket panel widget | `src/widgets/ticket-panel/*` |
| Battle panel widget | `src/widgets/battle-ticket-panel/*` |

## Manual Ticket Creation

```txt
POST /api/ticket
  |
  +- auth check
  +- parse body with insertTicketClientSchema
  +- create ticket id
  +- create stripe_event_id = manual_<id>
  +- normalize Instagram
  +- generate QR
  +- insert ticket
  +- ask Ticket Delivery to perform Email Provider Handoff best-effort
  +- Ticket Delivery marks mail_sent true if handoff succeeds
  |
  v
{ ticket, mailSent, mailError }
```

The ticket is durable before the email is sent. If Resend fails, the ticket
remains created and the caller receives `mailError`.

## QR Generation

```txt
generateAndStoreQRCode(url, filename)
  |
  +- QRCode.toBuffer(url)
  +- put(filename, qrBuffer, { access: "public" })
  |
  v
public Blob URL
```

Current QR target:

```txt
https://dashboard.nailmoment.pl/ticket/<ticketId>
```

Current Blob path pattern:

```txt
moment-qr/festival_2026/qr-code-<ticketId>.png
```

Blob options:

```txt
addRandomSuffix: false
allowOverwrite: false
```

This is intentional: QR URLs are customer-facing and may already exist in sent
emails. Do not overwrite or delete production QR blobs casually.

## Ticket Email

```txt
deliverTicket(ticket)
  |
  +- skip customer-facing handoff if the ticket has no email
  +- sendTicketEmail(...)
  +- mark mail_sent true after successful Email Provider Handoff
  |
  v
{ mailSent, mailError }
```

Email provider helper:

```txt
sendTicketEmail(to, name, qrCodeUrl, ticketType, ticketId?)
  |
  +- create Resend client lazily
  +- build plain text fallback
  +- render React Email template
  +- send from nailmoment-ticket@nailmoment.pl
```

The Resend API key is read lazily so importing email/QR helpers during build or
tests does not require the email secret until an email is actually sent.

## Battle Email

```txt
sendBattleEmail(to, name, ticketId)
  |
  +- create Resend client lazily
  +- render BattleTicketEmailTemplate
  +- send from nailmoment-battle@nailmoment.pl
```

Manual battle ticket creation uses:

```txt
POST /api/battle-ticket
```

Stripe battle ticket creation uses:

```txt
src/app/stripe/handlers/checkout-session-completed.ts
```

## Resend / Mail Sent Semantics

`mail_sent` means the app successfully called Resend for the normal ticket or
battle email.

It does not prove the customer opened the email, and it does not prove the
customer's mailbox accepted it after Resend.

Email errors are operational:

- log/return the error;
- keep the ticket;
- allow manual resend/follow-up;
- do not duplicate ticket fulfillment.

## Ticket Detail And Resend

```txt
POST /api/ticket/:id
  |
  +- auth check
  +- parse ticket id
  +- load ticket
  +- ask Ticket Delivery to resend using updated_grade || grade
  +- Ticket Delivery marks mail_sent true after successful handoff
```

This is used for manual resend flows.

## Email / PDF Preview

Preview API:

```txt
GET /api/pdf/:id
  |
  +- auth check
  +- load ticket
  +- render EmailTemplate with @react-email/render
  +- pretty HTML
  +- return text/html
```

Page-owned server actions:

```txt
src/pages/pdf-ticket-preview/api/email-preview.ts
  |
  +- getTicketHtml(id)
  +- getTicketText(id)
  +- previewCustomEmail(ticketId, subject, body)
  +- sendCustomEmail(ticketId, subject, body)
```

These actions live inside the page slice because they are specific to the email
preview workflow.

## Tests

There is no dedicated end-to-end email test. For related behavior:

- ticket parsing/domain tests live under `src/entities/ticket`;
- API client parsing tests live under `src/pages/finance/api`;
- email sending should be manually verified carefully against the correct
  environment because it can contact customers.
