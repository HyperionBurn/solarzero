import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side uploads (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

const BUCKET = "proposals";

export async function uploadProposalPdf(
  proposalId: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const key = `${proposalId}.pdf`;

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
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
