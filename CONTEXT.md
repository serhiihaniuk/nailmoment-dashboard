# Nail Moment Dashboard Context

This context describes the domain language for the Nail Moment production dashboard: festival tickets, battle registrations, finance tracking, ticket delivery, Stripe fulfillment, and Telegram voting.

## Language

**Ticket**:
A customer-facing admission record for the Nail Moment festival, created either from Stripe checkout or manually by an operator.
_Avoid_: Order, purchase, pass, booking

**Stripe Ticket**:
A **Ticket** created by **Stripe Checkout Fulfillment** from a paid Stripe Checkout Session.
_Avoid_: Stripe order, checkout ticket, paid ticket, online ticket

**Manual Ticket**:
A **Ticket** created by an operator instead of **Stripe Checkout Fulfillment**.
_Avoid_: Fake Stripe ticket, admin ticket, offline order

**Ticket Grade**:
The commercial tier of a **Ticket**, such as standard, maxi, or VIP.
_Avoid_: Ticket type, package, plan

**Battle Ticket**:
A customer-facing registration record for participating in the Nail Moment battle competition.
_Avoid_: Battle registration, nomination, contest entry, participant ticket

**Stripe Battle Ticket**:
A **Battle Ticket** created by **Stripe Checkout Fulfillment** from a paid Stripe Checkout Session.
_Avoid_: Stripe battle order, checkout battle ticket, paid battle ticket

**Manual Battle Ticket**:
A **Battle Ticket** created by an operator instead of **Stripe Checkout Fulfillment**.
_Avoid_: Fake Stripe battle ticket, admin battle ticket, offline entry

**Ticket Delivery**:
The customer-facing process of preparing a ticket email with its QR code and sending it to the customer.
_Avoid_: Email sending, PDF generation, fulfillment

**Ticket Delivery Status**:
The dashboard's record of whether **Ticket Delivery** was successfully handed off to the email provider.
_Avoid_: Mail sent, email status, delivery receipt

**Battle Ticket Delivery**:
The customer-facing process of preparing and sending a **Battle Ticket** email to the customer.
_Avoid_: Battle email sending, participant email, battle fulfillment

**Battle Ticket Delivery Status**:
The dashboard's record of whether **Battle Ticket Delivery** was successfully handed off to the email provider.
_Avoid_: Battle mail sent, participant email status, delivery receipt

**Ticket Preview**:
An internal operator workflow for inspecting **Ticket** email or PDF-style rendering before delivery or custom messaging.
_Avoid_: PDF page, email demo, render preview

**Ticket Arrival**:
The operator-recorded event that the customer associated with a **Ticket** has arrived at the festival.
_Avoid_: Ticket delivered, check-in, attendance, scan status

**Soft Deleted Ticket**:
A **Ticket** removed from normal operator workflows while preserving its record for audit, finance, QR, and historical references.
_Avoid_: Archived Ticket, hard-deleted ticket, inactive ticket

**Soft Deleted Battle Ticket**:
A **Battle Ticket** removed from normal operator workflows while preserving its record for audit and historical references.
_Avoid_: Archived Battle Ticket, hard-deleted battle ticket, inactive battle ticket

**Customer**:
A person associated with a **Ticket** or **Battle Ticket** through contact details used for delivery and follow-up.
_Avoid_: User, attendee, participant, client

**Operator**:
An authenticated dashboard user who manages tickets, battle tickets, finance, delivery, and previews.
_Avoid_: Customer, admin, user, staff

**Production Database**:
The live Neon Postgres database used by the production dashboard.
_Avoid_: dev database, preview database, local database

**Production Dashboard**:
The live Vercel-hosted dashboard used for real Nail Moment operations.
_Avoid_: preview app, local app, staging dashboard

**Dev Environment**:
The isolated non-production environment configured through local Vercel preview env values for testing changes before production.
_Avoid_: staging, production preview, local-only environment

**QR Code Storage**:
The public asset storage used for **Ticket QR Codes** that may already be referenced by customer emails.
_Avoid_: Blob store, Vercel Blob, QR folder

**Email Provider Handoff**:
The moment the dashboard successfully asks the email provider to send a **Ticket** or **Battle Ticket** email.
_Avoid_: email delivery, inbox delivery, mail sent

**Ticket QR Code**:
A public QR image that resolves to the dashboard URL for a specific **Ticket**.
_Avoid_: QR, Blob, ticket image, code

**Stripe Checkout Fulfillment**:
The process that handles a paid Stripe Checkout Session by creating the matching dashboard records and best-effort customer delivery.
_Avoid_: Stripe webhook, payment handling, ticket creation, order fulfillment

**Payment**:
A finance record for one expected or received payment toward a **Ticket**.
_Avoid_: Payment Installment, payment row, invoice payment, transaction

**Invoice Status**:
The finance state that records whether an invoice is not needed, requested, or sent for a **Payment**.
_Avoid_: Invoice flag, invoice request, invoice payment status

**Sale Source**:
The channel or origin through which **Ticket** revenue was received or expected, such as site checkout or direct transfer.
_Avoid_: Payment source, channel, origin

**Payment Method**:
The recorded method used to pay a **Payment**.
_Avoid_: Sale Source, payment type, channel

**Payment Plan**:
The finance rule that determines whether a **Ticket** is unpaid by schedule, fully paid at once, split into multiple **Payments**, free, sponsored, or custom.
_Avoid_: Installment plan, payment schedule, payment type

**Ticket Finance**:
The finance state for a **Ticket**, including totals, discount, tax or fee amount, sale source, invoice details, notes, and **Payment Plan**.
_Avoid_: Finance row, accounting data, payment info

**Ticket Discount**:
A reduction applied to a **Ticket** gross total before calculating the payable total.
_Avoid_: Discount code, promotion, coupon

**Tax Amount**:
The finance amount subtracted from a **Ticket** payable total when calculating net total.
_Avoid_: Fee Amount, Stripe fee, VAT unless the workflow explicitly means VAT

**Ticket Finance Totals**:
The calculated and stored money totals used to understand a **Ticket** gross, payable, paid, remaining, tax, and net amounts.
_Avoid_: Summary, chart totals, revenue numbers

**Paid Ticket**:
A **Ticket** whose **Ticket Finance Totals** show no remaining amount due.
_Avoid_: Stripe Ticket, complete ticket, closed ticket

**Finance Autosave**:
The operator-facing workflow that saves **Ticket**, **Ticket Finance**, **Payment Plan**, and **Payment** edits from the finance page as fields change.
_Avoid_: Optimistic save, inline edit, mutation flow

## Relationships

- A **Ticket** is sent to the customer through **Ticket Delivery**.
- **Ticket Delivery Status** records the **Email Provider Handoff** result for **Ticket Delivery**, not whether the customer opened or received the email.
- **Ticket Delivery** includes a **Ticket QR Code** for the delivered **Ticket**.
- **Ticket Preview** lets an operator inspect **Ticket Delivery** output before delivery or custom messaging.
- A **Ticket QR Code** belongs to exactly one **Ticket**.
- **QR Code Storage** stores public **Ticket QR Codes**.
- **Ticket Arrival** is separate from **Ticket Delivery**.
- A **Soft Deleted Ticket** remains a **Ticket** and is not hard-deleted from storage.
- A **Soft Deleted Battle Ticket** remains a **Battle Ticket** and is not hard-deleted from storage.
- A **Customer** may be associated with one or more **Tickets** or **Battle Tickets**.
- An **Operator** manages **Tickets**, **Battle Tickets**, finance, delivery, and previews through the dashboard.
- The **Production Dashboard** uses the **Production Database**.
- The **Dev Environment** is separate from the **Production Dashboard** and **Production Database**.
- The **Production Database** stores live **Tickets**, **Battle Tickets**, **Ticket Finance**, and **Payments**.
- A **Ticket** has one **Ticket Grade**.
- A **Stripe Ticket** and a **Manual Ticket** are origin-specific kinds of **Ticket**.
- A **Battle Ticket** is separate from a **Ticket** and does not grant normal festival admission unless the business explicitly treats it that way outside the dashboard.
- A **Battle Ticket** is sent to the customer through **Battle Ticket Delivery**.
- **Battle Ticket Delivery Status** records the **Email Provider Handoff** result for **Battle Ticket Delivery**, not whether the customer opened or received the email.
- A **Stripe Battle Ticket** and a **Manual Battle Ticket** are origin-specific kinds of **Battle Ticket**.
- **Stripe Checkout Fulfillment** creates either a **Ticket** or a **Battle Ticket** from a paid Stripe Checkout Session.
- **Stripe Checkout Fulfillment** may trigger **Ticket Delivery**, but failed delivery does not undo the created records.
- A **Ticket** may have one **Ticket Finance** record.
- A **Ticket** may have zero or more **Payments**.
- A **Payment** has one **Invoice Status**.
- A **Payment** may have one **Payment Method**.
- **Ticket Finance** and **Payment** can record a **Sale Source**.
- **Ticket Finance** may include a **Ticket Discount** stored as an amount.
- **Ticket Finance** may include a **Tax Amount** used to calculate net total.
- **Ticket Finance Totals** are derived from **Ticket Finance** and **Payments**.
- **Ticket Finance** owns the **Payment Plan** for its **Ticket**.
- A **Paid Ticket** is a finance status, not a **Ticket** origin.
- A **Payment Plan** determines the expected **Payments** for a **Ticket**.
- **Finance Autosave** updates **Ticket**, **Ticket Finance**, **Payment Plan**, and **Payment** data from the finance page.

## Example Dialogue

> **Dev:** "When a customer buys festival admission in Stripe, do we create an Order?"
> **Domain expert:** "No, the dashboard tracks that as a **Ticket**."

> **Dev:** "Is every paid ticket a **Stripe Ticket**?"
> **Domain expert:** "No, **Stripe Ticket** means the **Ticket** came from Stripe checkout; a **Manual Ticket** can also be marked paid in finance."

> **Dev:** "Can I treat every **Stripe Ticket** as a **Paid Ticket** forever?"
> **Domain expert:** "No, **Stripe Ticket** is origin language; **Paid Ticket** comes from **Ticket Finance Totals**."

> **Dev:** "Should standard, maxi, and VIP be called payment plans?"
> **Domain expert:** "No, those are **Ticket Grades**; **Payment Plan** is about finance scheduling."

> **Dev:** "Is a competition participant just another **Ticket**?"
> **Domain expert:** "No, competition participation is tracked as a **Battle Ticket**."

> **Dev:** "Should I call an operator-created competition registration a fake Stripe battle ticket?"
> **Domain expert:** "No, call it a **Manual Battle Ticket**."

> **Dev:** "If Resend fails after we create a **Ticket**, did fulfillment fail?"
> **Domain expert:** "The **Ticket** exists, but **Ticket Delivery** failed and needs follow-up."

> **Dev:** "Can we replace the Blob for an old customer email?"
> **Domain expert:** "Be careful: the customer email points at a **Ticket QR Code** that may already be in use."

> **Dev:** "If Stripe retries a paid checkout, do we create another **Ticket**?"
> **Domain expert:** "No, **Stripe Checkout Fulfillment** must be idempotent for that checkout."

## Flagged Ambiguities

- **Payment** is the domain term for the dashboard finance record. Stripe also uses "payment" language, but Stripe-specific events and sessions should be named explicitly as Stripe concepts.
- "Delivered" refers to **Ticket Delivery** or **Battle Ticket Delivery**, not **Ticket Arrival**.
- `archived` is the implementation field name for soft delete; the domain language is **Soft Deleted Ticket** or **Soft Deleted Battle Ticket**.
- Percent-like discount input is an operator convenience; the domain **Ticket Discount** is stored as an amount.
- `tax_amount` may currently include Stripe processing-fee estimates, but the dashboard domain term is **Tax Amount**.
- Vercel names the local dev env file `.vercel/.env.preview.local`, but the domain language is **Dev Environment**.
- **Customer** is distinct from **Operator** and from dashboard auth user records.
