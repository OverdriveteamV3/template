# Over Drive Booking

Reusable appointment platform for many businesses. One codebase serves every tenant. A business is configuration: identity, services, staff, content, forms, and theme. The same build can also be locked to one tenant.

## Local sample

```bash
npm install
npm run dev
```

Open [http://demo-studio.localhost:3000](http://demo-studio.localhost:3000). A second sample, Harbor Office, is at [http://demo-office.localhost:3000](http://demo-office.localhost:3000). Both are labeled sample previews and do not create reservations until Supabase is connected.

macOS resolves `*.localhost` for curl and Chrome. Node's resolver does not. Add this line to `/etc/hosts` when a Node tool must open those hosts directly:

```
127.0.0.1 demo-studio.localhost demo-office.localhost
```

## Connect a new Supabase project

Create a new project for Over Drive. Do not reuse a project that belongs to another product.

1. Copy `.env.example` to `.env.local` and fill the public URL, publishable key, and secret key.
2. Apply `supabase/migrations` in filename order, then `supabase/seed.sql` for the fictional local demo.
3. In Authentication, enable email/password and set the site URL to the local origin you use.
4. Sign up once, then set `PLATFORM_OWNER_EMAIL` and run `npm run promote:owner`. The script writes one `platform_admins` row for that account.

5. Open the platform host, for example `http://localhost:3000/owner`, and create a business from a preset.

`npm run test:db` runs `supabase/tests/booking_and_rls.sql` when Docker and the Supabase CLI are available. If Docker is stopped, the command records the skip and exits successfully. Start Docker, run `supabase start`, then rerun `npm run test:db`.

## Deployment models

**Multi-tenant:** set `ROOT_DOMAIN` to the booking domain, for example `book.overdriveio.com`. A business is then `{slug}.book.overdriveio.com`. A custom hostname works only after its `tenant_domains` row is marked verified.

**Dedicated:** set `TENANT_LOCK_SLUG` and `ALLOWED_HOSTS` to that business. The same code refuses every other slug.

Set `PREVIEW_TOKEN_SECRET`, `CRON_SECRET`, and `AUTH_TRANSFER_SECRET` to long random values. The notification cron is `GET /api/cron/notifications` with `Authorization: Bearer $CRON_SECRET`.

## Email

`EMAIL_FROM` is the verified Over Drive sender. A business address is used as reply-to. A verified custom sender is used only when `sender_mode` is `verified_domain` and `verified_from_address` is set. Admins cannot enter an API key. A failed email stays in `notification_outbox` and does not remove the appointment or form submission.

## Publishing and rollback

Website edits stay in a draft. Publish archives the previous live version and creates the next draft. Rollback copies an archived version forward. Preview links expire after 15 minutes and are bound to the host.

Content rollback and deployment rollback are separate. Roll back a website version from the dashboard. Roll back the application by promoting the previous Vercel deployment. Enable Supabase backups and point-in-time recovery before any production data is stored.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:db
npm run test:e2e
npm run build
```

`npm run test:db` needs Docker and a local Supabase stack. Without Docker it records the skip. This repository has not been deployed, so there is no production URL to check. It does not claim a HIPAA deployment.
