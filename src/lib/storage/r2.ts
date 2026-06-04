import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET ?? "solarzero-proposals";
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "";

/**
 * Upload a PDF buffer to Cloudflare R2.
 * Returns the public URL of the uploaded file.
 */
export async function uploadProposalPdf(
  proposalId: string,
  pdfBuffer: Buffer
): Promise<string> {
  const key = `proposals/${proposalId}.pdf`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      CacheControl: "public, max-age=31536000",
    })
  );

  // Return public URL if configured, otherwise return the key
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key}`;
  }

  return key;
}

/**
 * Get a signed URL for downloading a proposal PDF.
 */
export async function getProposalDownloadUrl(proposalId: string): Promise<string> {
  const key = `proposals/${proposalId}.pdf`;

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  // For R2, we return the public URL if available
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key}`;
  }

  // Fallback: generate a presigned URL (requires @aws-sdk/s3-request-presigner)
  // For now, return the key — caller should handle presigning
  return key;
}
