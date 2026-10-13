/**
 * The Supabase pooler regions the data-source form offers. Zod-free so the
 * settings and setup forms (client components) can list them; the server's
 * config schema (src/server/integrations/catalog.ts) checks against them.
 */
export const SUPABASE_POOLER_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "sa-east-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
] as const;
