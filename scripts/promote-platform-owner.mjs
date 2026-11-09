const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.env.PLATFORM_OWNER_EMAIL;

if (!url || !key || !email) {
  console.log("Skipped platform owner promotion. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, and PLATFORM_OWNER_EMAIL, then run npm run promote:owner.");
  process.exit(0);
}

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (error) {
  console.error(error.message);
  process.exit(1);
}
const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error("No auth user exists for that email yet. Sign up first, then rerun this script.");
  process.exit(1);
}
const inserted = await admin.from("platform_admins").upsert({ user_id: user.id }, { onConflict: "user_id" });
if (inserted.error) {
  console.error(inserted.error.message);
  process.exit(1);
}
console.log("Platform owner recorded for the matching account.");
