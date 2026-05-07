# Protect Production Data And Customer-Facing Assets

The Nail Moment dashboard is a live production operations system, so agents and developers must not perform production database writes, migrations, QR Code Storage changes, webhook changes, environment changes, or customer-facing email/QR actions without explicit approval for the exact action. Development and migration testing should use isolated preview or development resources before production changes are considered.
