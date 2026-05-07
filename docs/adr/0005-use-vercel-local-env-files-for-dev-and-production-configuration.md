# Use Vercel Local Env Files For Dev And Production Configuration

The dashboard has separate local Vercel environment files for dev and production configuration: `.vercel/.env.preview.local` for the **Dev Environment** and `.vercel/.env.production.local` for production. Agents and developers must verify which env file is being used before testing workflows that can write data, send emails, create QR assets, process payments, or call external services.
