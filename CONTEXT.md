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

**Soft Deleted Audience Vote Record**:
An **Audience Vote**, **Vote Candidate**, or **Vote Candidate Media** removed from normal voting setup while preserving its record.
_Avoid_: hard-deleted vote, removed candidate, deleted media

**Customer**:
A person associated with a **Ticket** or **Battle Ticket** through contact details used for delivery and follow-up.
_Avoid_: User, attendee, participant, client

**Operator**:
An authenticated dashboard user who manages tickets, battle tickets, finance, delivery, and previews.
_Avoid_: Customer, admin, user, staff

**Audience Vote**:
A Telegram Mini App voting workflow for choosing one published option from the current event voting stage.
_Avoid_: Telegram vote, bot poll, video vote

**Audience Vote Kind**:
The event stage represented by an **Audience Vote**, such as speaker, battle, or final battle.
_Avoid_: vote type, bot type, category

**Audience Vote Title**:
The public label shown to **Telegram Voters** for an **Audience Vote**.
_Avoid_: kind, internal type, slug

**Battle Category Vote**:
An **Audience Vote** for one battle category in the sequential battle voting flow.
_Avoid_: changing battle category, active category, mega vote

**Audience Vote Status**:
The workflow state of an **Audience Vote**: draft, scheduled, open, or closed.
_Avoid_: active flag, published flag, enabled

**Vote Candidate**:
A published option that a **Telegram Voter** can choose in an **Audience Vote**.
_Avoid_: Speaker Candidate, speaker option, video, contestant

**Vote Candidate Display Name**:
The public name or anonymous label shown for a **Vote Candidate**.
_Avoid_: internal name, real name, participant name

**Vote Candidate Internal Name**:
The Operator-only name or note used to identify a **Vote Candidate** in the dashboard.
_Avoid_: display name, public name, voter name

**Vote Candidate Caption**:
Optional public text shown with a **Vote Candidate** in the **Audience Vote Mini App**.
_Avoid_: internal note, operator note, bio field

**Audience Vote Window**:
The scheduled time range during which an **Audience Vote** accepts votes from **Telegram Voters**.
_Avoid_: voting schedule, active time, timer

**Audience Vote Broadcast**:
An Operator-authored Telegram message sent from the dashboard to **Telegram Voters** for an **Audience Vote**.
_Avoid_: Speaker Vote Broadcast, bot blast, notification

**Audience Vote Broadcast Delivery**:
The per-voter delivery record used to send an **Audience Vote Broadcast** safely and retry failures.
_Avoid_: send attempt, broadcast row, notification status

**Audience Vote Broadcast Canary**:
The Operator-reviewed test stage before an **Audience Vote Broadcast** is sent to all targeted **Telegram Voters**.
_Avoid_: admin test, dry run, preview blast

**Audience Vote Mini App**:
The Telegram-launched web interface where **Telegram Voters** browse **Vote Candidates** and cast votes in an **Audience Vote**.
_Avoid_: Telegram slider, bot voting UI, web poll

**Audience Vote Update Screen**:
The Mini App screen shown when no **Audience Vote** is open, with Operator-managed event updates and next voting context.
_Avoid_: empty state, waiting page, story

**Vote Candidate Media**:
A public photo or video asset shown for a **Vote Candidate** in the **Audience Vote Mini App**.
_Avoid_: Telegram file, video file_id, media blob

**Telegram Voter**:
A Telegram account that opens the voting bot and is allowed to cast at most one vote in an **Audience Vote**.
_Avoid_: User, Customer, attendee, Operator

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
The finance state for a **Ticket**, including totals, discount, commission amount, sale source, invoice details, notes, and **Payment Plan**.
_Avoid_: Finance row, accounting data, payment info

**Ticket Discount**:
A reduction applied to a **Ticket** gross total before calculating the payable total.
_Avoid_: Discount code, promotion, coupon

**Commission Amount**:
The finance amount stored in the legacy `tax_amount` column and subtracted from a **Ticket** payable total like a discount.
_Avoid_: Tax, VAT unless the workflow explicitly means VAT

**Ticket Finance Totals**:
The calculated and stored money totals used to understand a **Ticket** gross, payable, paid, remaining, commission, and net amounts.
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
- A **Soft Deleted Audience Vote Record** is not hard-deleted from storage.
- A **Soft Deleted Audience Vote Record** is excluded from voter-facing voting and opening validation.
- A **Customer** may be associated with one or more **Tickets** or **Battle Tickets**.
- An **Operator** manages **Tickets**, **Battle Tickets**, finance, delivery, and previews through the dashboard.
- A **Telegram Voter** is separate from a **Customer** and from an **Operator**.
- A **Telegram Voter** is identified by Telegram user id and may have a Telegram username.
- A **Telegram Voter** has a first-seen timestamp from `telegram_users.created_at`; this is not a last-seen timestamp.
- A **Telegram Voter** does not need to be linked to a **Ticket** or **Battle Ticket** to vote in an **Audience Vote**.
- A **Telegram Voter** may cast at most one vote in an **Audience Vote**.
- A **Telegram Voter** who can open the **Audience Vote Mini App** with valid Telegram identity can vote, even if they were previously unreachable for broadcasts.
- Opening the **Audience Vote Mini App** with valid Telegram identity may make a **Telegram Voter** active for future **Audience Vote Broadcasts** again.
- An **Audience Vote** has one **Audience Vote Kind**.
- An **Audience Vote** has one **Audience Vote Title**.
- An **Audience Vote** has one **Audience Vote Status**.
- Supported **Audience Vote Kinds** are speaker, battle, and final battle.
- Audience voting stages are sequential; only one **Audience Vote** should be open at a time.
- An **Operator** cannot open an **Audience Vote** while another **Audience Vote** is open.
- Each battle category is represented by its own **Battle Category Vote**.
- Operators may prepare multiple draft or scheduled **Audience Votes** ahead of time.
- An **Audience Vote** cannot open until it has a title, kind, at least two **Vote Candidates**, and active media for each **Vote Candidate**.
- An **Audience Vote** has one or more **Vote Candidates**.
- A **Vote Candidate** has one **Vote Candidate Display Name**.
- A **Vote Candidate** may have one **Vote Candidate Internal Name**.
- A **Vote Candidate** may have one **Vote Candidate Caption**.
- **Vote Candidates** are shown in Operator-defined order.
- **Vote Candidate Media** is shown in upload order.
- The **Audience Vote Mini App** never shows a **Vote Candidate Internal Name**.
- Battle **Audience Votes** use anonymous **Vote Candidate Display Names**.
- Speaker **Audience Votes** may use real speaker names as **Vote Candidate Display Names**.
- A **Vote Candidate** has one or more **Vote Candidate Media** items.
- **Vote Candidate Media** uses public asset URLs.
- **Vote Candidate Media** should be prepared for mobile **Audience Vote Mini App** playback before the **Audience Vote** opens.
- Photo **Vote Candidate Media** must be 20 MB or less.
- Video **Vote Candidate Media** must be 100 MB or less.
- Replaced **Vote Candidate Media** should be kept during event operations and cleaned up only later as an explicit maintenance task.
- An **Audience Vote** may have an **Audience Vote Window** for planning and display.
- The **Audience Vote Mini App** is the primary voting surface for an **Audience Vote**.
- The **Audience Vote Mini App** shows an **Audience Vote Update Screen** when no **Audience Vote** is open.
- An **Operator** manages the **Audience Vote Update Screen** content from the dashboard.
- **Audience Vote** voter-facing content is Ukrainian-only.
- The **Audience Vote Mini App** presents **Vote Candidates** as a vertical feed with an in-card media carousel, text, and vote action.
- The Telegram bot is the entry point to the **Audience Vote Mini App**, not the primary voting surface.
- A **Telegram Voter** must open the **Audience Vote Mini App** from Telegram to vote.
- The Telegram bot and **Audience Vote Mini App** may both record the same **Telegram Voter** idempotently.
- An **Operator** may upload **Vote Candidate Media** from the dashboard.
- An **Operator** may update **Vote Candidate Media** before an **Audience Vote** opens.
- An **Operator** may set up **Vote Candidates** before an **Audience Vote** opens.
- Once an **Audience Vote** is open, its **Vote Candidates** should remain stable.
- An **Operator** may replace bad **Vote Candidate Media** while an **Audience Vote** is open, but the original media should be kept and the **Vote Candidate** should remain the same.
- An **Operator** opens and closes an **Audience Vote** from the dashboard.
- Closing an **Audience Vote** immediately stops new votes and vote changes.
- A closed **Audience Vote** cannot be reopened.
- An **Operator** may send an **Audience Vote Broadcast** from the dashboard.
- An **Operator** must confirm an **Audience Vote Broadcast** before delivery rows are created.
- A **Telegram Voter** may ask the bot to send the **Audience Vote Mini App** link again.
- A **Telegram Voter** casts a vote for one **Vote Candidate** in an **Audience Vote**.
- A **Telegram Voter** may vote once in each sequential **Audience Vote**.
- A **Telegram Voter** may change their selected **Vote Candidate** until the **Audience Vote** closes.
- A **Telegram Voter** vote is saved immediately when they choose a **Vote Candidate**.
- Saving the same **Telegram Voter** vote more than once should be treated as a successful no-op.
- Only the current **Telegram Voter** vote is counted; historical vote changes are not preserved.
- The **Audience Vote Mini App** shows the **Telegram Voter** which **Vote Candidate** is currently selected.
- A **Telegram Voter** does not see **Audience Vote** results in the **Audience Vote Mini App**.
- An **Operator** can see **Audience Vote** results in the dashboard.
- **Audience Vote** dashboard results show ranked **Vote Candidates**, vote totals, and percentages.
- **Audience Vote** dashboard results are aggregate and do not show a voter list.
- An **Audience Vote Broadcast** targets all active **Telegram Voters** who have opened the voting bot.
- An **Audience Vote Broadcast** has message text and may include an open-voting button.
- An **Audience Vote Broadcast** starts with an **Audience Vote Broadcast Canary** before normal delivery.
- An **Audience Vote Broadcast Canary** sends first to every configured **Operator**, waits two minutes, sends to 25 **Telegram Voters** plus every configured **Operator**, then waits two more minutes before normal delivery.
- An **Operator** may interrupt an **Audience Vote Broadcast** from the dashboard.
- Interrupting an **Audience Vote Broadcast** must stop all future unsent deliveries.
- An **Audience Vote Broadcast** is delivered through **Audience Vote Broadcast Deliveries**.
- An **Audience Vote Broadcast Delivery** is attempted at most once for a **Telegram Voter** to avoid duplicate Telegram messages after ambiguous provider failures.
- **Audience Vote Broadcast Deliveries** are processed by an immediate dashboard-triggered kick and a scheduled processor for due unsent deliveries.
- A **Telegram Voter** that blocks or restricts the bot should be excluded from future **Audience Vote Broadcasts**.
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
- **Ticket Finance** may include a **Commission Amount** used to calculate payable and net totals.
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
- `tax_amount` is a legacy column name; the dashboard domain term is **Commission Amount**.
- Vercel names the local dev env file `.vercel/.env.preview.local`, but the domain language is **Dev Environment**.
- **Customer** is distinct from **Operator** and from dashboard auth user records.
