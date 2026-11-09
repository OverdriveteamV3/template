-- Local demo only. This is a fictional business, not production activity.
insert into tenants (id, slug, name, category, timezone, status, preset, is_demo)
values ('55555555-5555-4555-8555-555555555555', 'demo-studio', 'Northline Studio', 'Hair studio', 'America/New_York', 'active', 'salon', true)
on conflict (id) do nothing;

insert into tenant_domains (tenant_id, hostname, kind, verification_status, verified_at, is_primary)
values ('55555555-5555-4555-8555-555555555555', 'demo-studio.localhost', 'platform_subdomain', 'verified', now(), true)
on conflict (hostname) do nothing;

insert into tenant_booking_rules (tenant_id, horizon_days, min_notice_minutes, slot_interval_minutes, cancellation_cutoff_minutes, reschedule_cutoff_minutes)
values ('55555555-5555-4555-8555-555555555555', 45, 120, 30, 1440, 1440)
on conflict (tenant_id) do nothing;

insert into notification_settings (tenant_id, public_contact_email, reply_to, recipients)
values ('55555555-5555-4555-8555-555555555555', 'hello@example.com', 'hello@example.com', array['owner@example.com'])
on conflict (tenant_id) do nothing;

insert into services (id, tenant_id, name, description, duration_minutes, price_cents, show_price, location, sort_order)
values
  ('11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555555', 'Cut and style', 'A scheduled cut with a finish.', 60, 8500, true, 'In studio', 1),
  ('22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555555555', 'Color appointment', 'A single-process color visit.', 90, 16000, true, 'In studio', 2)
on conflict (id) do nothing;

insert into staff (id, tenant_id, display_name, timezone, bio)
values ('33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'Sample stylist', 'America/New_York', 'Fictional staff profile for the local demo.')
on conflict (id) do nothing;

insert into staff_services (tenant_id, staff_id, service_id)
values
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111'),
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222')
on conflict do nothing;

insert into working_hours (tenant_id, staff_id, weekday, start_minute, end_minute)
select '55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', day, 540, 1020
from generate_series(1, 5) as day
where not exists (
  select 1 from working_hours where staff_id = '33333333-3333-4333-8333-333333333333'
);

insert into website_versions (tenant_id, version, status, document, theme, published_at)
select '55555555-5555-4555-8555-555555555555', 1, 'published',
$doc${
  "identity": {"name": "Northline Studio", "category": "Hair studio", "tagline": "Cuts, color, and calm appointments.", "logoUrl": "", "logoDarkUrl": "", "faviconUrl": ""},
  "hero": {"imageUrl": "", "profileUrl": "", "title": "Northline Studio", "subtitle": "Cuts, color, and calm appointments.", "cta": "Book an Appointment", "alt": "", "focalX": 50, "focalY": 40},
  "about": {"body": "This paragraph is placeholder copy for the fictional sample studio.", "companyBio": "Northline Studio is a fictional sample used to preview booking.", "professionalBio": "", "short": "Sample copy for the local demo. It is not a real business.", "visible": true},
  "contact": {"email": "hello@example.com", "phone": "(212) 555-0100", "address": "100 Example Street, New York, NY", "mapUrl": "", "hours": "Tue–Fri, 9:00–5:00", "socials": [{"label": "Instagram", "href": "https://instagram.com"}, {"label": "Facebook", "href": "https://facebook.com"}, {"label": "TikTok", "href": "https://www.tiktok.com"}]},
  "facts": [{"label": "Studio", "value": "By appointment"}, {"label": "Languages", "value": "English"}],
  "sections": ["about", "services", "faqs"],
  "gallery": [],
  "testimonials": [],
  "faqs": [{"question": "Is this a real studio?", "answer": "No. This seeded tenant is fictional sample data for development."}],
  "seo": {"title": "Northline Studio", "description": "Sample booking page", "imageUrl": "", "indexable": false}
}$doc$::jsonb,
$theme${
  "background": "#ffffff", "surface": "#f6f5f1", "foreground": "#111111", "muted": "#6b6b64",
  "border": "#e7e6e0", "primary": "#ddf20a", "secondary": "#00595b",
  "font": "geist", "density": "compact", "radius": "16", "button": "rounded", "layout": "reference"
}$theme$::jsonb,
now()
where not exists (select 1 from website_versions where tenant_id = '55555555-5555-4555-8555-555555555555');
