import { deliverConfirmationEmail } from "./email.ts";
import { buildReceiptData, generateAndStoreReceipt } from "./receipt.ts";

/**
 * Post-confirmation side effects, shared by the webhook and the QR
 * reconciliation path so the two can never drift.
 *
 * Both steps are idempotent and must never fail the caller: a payment that is
 * already confirmed in the database stays confirmed even if storage or email is
 * temporarily unavailable.
 */
export async function finalizeConfirmedRegistration(registrationId: string): Promise<{
  receipt: "ok" | "failed";
  email: "sent" | "failed" | "skipped";
}> {
  let receipt: "ok" | "failed" = "failed";
  let email: "sent" | "failed" | "skipped" = "skipped";

  try {
    const receiptData = await buildReceiptData(registrationId);
    if (receiptData) {
      await generateAndStoreReceipt(receiptData);
      receipt = "ok";
    }
  } catch (err) {
    console.error("[zelvation] receipt failed", err instanceof Error ? err.message : err);
  }

  try {
    const result = await deliverConfirmationEmail(registrationId);
    email = result.status === "sent" ? "sent" : "failed";
  } catch (err) {
    console.error("[zelvation] email failed", err instanceof Error ? err.message : err);
    email = "failed";
  }

  return { receipt, email };
}
