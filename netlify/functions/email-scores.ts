import type { Handler } from "@netlify/functions";

interface EmailRequest {
  engagementId: string;
  toolId: string;
  observerId: string;
  observerEmail: string;
}

/**
 * Serverless function to email a PDF of scores to the observer
 * when they complete scoring all participants for a tool.
 *
 * In production, this would:
 * 1. Fetch engagement data from Supabase
 * 2. Generate a PDF server-side
 * 3. Send via Resend (or similar transactional email service)
 *
 * Currently a stub that logs the intent and returns success.
 * Wire up Resend API key in environment variables when ready.
 */
const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const body: EmailRequest = JSON.parse(event.body ?? "{}");
    const { engagementId, toolId, observerId, observerEmail } = body;

    if (!engagementId || !toolId || !observerId || !observerEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // TODO: Wire up actual email sending with Resend
    // const resend = new Resend(process.env.RESEND_API_KEY);
    //
    // 1. Fetch engagement + scores from Supabase
    // 2. Generate PDF (using pdfkit or jspdf)
    // 3. Send email:
    // await resend.emails.send({
    //   from: "ACA <noreply@synovate.co.in>",
    //   to: observerEmail,
    //   subject: `ACA Scoring Complete — ${toolName} — ${engagementName}`,
    //   text: `Your scoring for ${toolName} is complete. PDF attached.`,
    //   attachments: [{ filename: `${toolName}-scores.pdf`, content: pdfBuffer }],
    // });

    console.log(`[email-scores] Would email ${observerEmail} for engagement=${engagementId}, tool=${toolId}, observer=${observerId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Email queued (stub)" }),
    };
  } catch (err) {
    console.error("[email-scores] Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

export { handler };
