import { createClient } from "@supabase/supabase-js";
import { cleanEnvValue } from "../env";

const BUCKET = "proposals";
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase storage environment variables are required");
  }

  // Use service role key for server-side uploads (bypasses RLS).
  supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  return supabaseClient;
}

export async function uploadProposalPdf(
  proposalId: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const key = `${proposalId}.pdf`;
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

export async function getProposalDownloadUrl(
  proposalId: string,
): Promise<string> {
  const key = `${proposalId}.pdf`;
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
