import { NextResponse } from "next/server";
import { REGISTRATION_SCHEMA, STORAGE_BUCKET_RECEIPTS } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRegistrationByToken } from "@/lib/registrations";

/**
 * Streams the privately stored PDF receipt through a short-lived signed URL.
 * Receipts are never public: the bucket is private and this route is the only
 * way to reach a file, keyed by the participant's secret access token.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const registration = await getRegistrationByToken(params.token);
  if (!registration || registration.status !== "confirmed") {
    return NextResponse.json({ error: "Receipt not available" }, { status: 404 });
  }

  const admin = createAdminClient();
  const successful = registration.registration_payments?.find((p) => p.status === "successful");

  let path = successful?.receipt_url ?? null;

  // Fall back to the deterministic object key if the column has not been stamped.
  if (!path) {
    path = `${registration.team_id}.pdf`;
    const { data: exists } = await admin.storage.from(STORAGE_BUCKET_RECEIPTS).list("", {
      search: path,
      limit: 1,
    });
    if (!exists?.length) path = null;
  }

  if (!path) {
    return NextResponse.json(
      {
        error:
          "Your receipt is still being generated. Refresh this page in a few seconds, or download it from your confirmation page.",
      },
      { status: 409 },
    );
  }

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET_RECEIPTS)
    .createSignedUrl(path, 120, { download: `${registration.team_id}-zelvation-receipt.pdf` });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Could not create a download link." }, { status: 500 });
  }

  await admin
    .schema(REGISTRATION_SCHEMA)
    .from("registration_audit_logs")
    .insert({
      action: "receipt.download",
      entity: "registration",
      entity_id: registration.id,
      metadata: { team_id: registration.team_id },
    });

  return NextResponse.redirect(data.signedUrl, 302);
}
