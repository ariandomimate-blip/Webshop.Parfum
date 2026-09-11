# Payments Foundation

Shared payment-security contract for the anonymous perfume webshop.

- Customer payment must use a real provider checkout.
- Orders are confirmed only from verified, idempotent provider webhooks.
- Never trust client-side payment success as proof of payment.
- Keep API keys/webhook secrets in Render or other deployment secret storage, never Git.
- Do not implement crypto custody or store private keys in the webshop.
- Production orders, payment intents, events, refunds and audit records must be persistent and transactional.
