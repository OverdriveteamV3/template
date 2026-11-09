import { spawnSync } from "node:child_process";

const docker = spawnSync("docker", ["info"], { encoding: "utf8" });
if (docker.status !== 0) {
  console.log("Skipped database tests: Docker is not running, so the local Supabase Postgres and pgTAP overlap tests could not run.");
  process.exit(0);
}

const supabase = spawnSync("supabase", ["--version"], { encoding: "utf8" });
if (supabase.status !== 0) {
  console.log("Skipped database tests: the Supabase CLI is not installed, so pgTAP and the overlap race could not run against Postgres.");
  process.exit(0);
}

const test = spawnSync("supabase", ["test", "db"], { stdio: "inherit" });
if (test.status !== 0) {
  console.log("Database tests did not pass. Start the local stack with `supabase start` and rerun `npm run test:db`.");
  process.exit(test.status ?? 1);
}
