import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend("re_LxXZB1Ak_9k1ZFZYipRB8MUkPNh1PeBKU");

// Recipients — add / remove addresses here
const RECIPIENTS = ["vishnu@shivik.in"];

function buildHtml(month: string, notes: string, sentAt: string): string {
  const lines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const noteRows = lines
    .map(
      (line, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9f7f3"}">
          <td style="padding:10px 16px;font-size:14px;color:#3d2e0e;line-height:1.6;border-bottom:1px solid #e9e0d0;">
            ${line.startsWith("-") || line.startsWith("•") ? line : `• ${line}`}
          </td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IAV Notes — ${month}</title>
</head>
<body style="margin:0;padding:0;background:#f4ede0;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede0;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1209 0%,#3d2e0e 60%,#6b4e15 100%);padding:32px 36px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:11px;color:#d4a853;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Indian Art Villa</p>
                    <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700;line-height:1.2;">Monthly Notes</h1>
                    <p style="margin:8px 0 0;font-size:15px;color:#d4a853;font-weight:600;">${month}</p>
                  </td>
                  <td align="right" valign="top">
                    <div style="background:rgba(212,168,83,0.15);border:1px solid rgba(212,168,83,0.3);border-radius:8px;padding:8px 14px;display:inline-block;">
                      <p style="margin:0;font-size:10px;color:#d4a853;letter-spacing:1px;text-transform:uppercase;">Sent</p>
                      <p style="margin:2px 0 0;font-size:12px;color:#e8d5a3;font-weight:500;">${sentAt}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Month badge -->
          <tr>
            <td style="background:#fdfaf5;border-bottom:1px solid #e9e0d0;padding:12px 36px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#d4a853;border-radius:20px;padding:4px 14px;">
                    <span style="font-size:11px;color:#1a1209;font-weight:700;letter-spacing:1px;text-transform:uppercase;">📅 ${month} Report Notes</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notes section header -->
          <tr>
            <td style="padding:24px 36px 8px;">
              <p style="margin:0;font-size:12px;font-weight:700;color:#8b6914;letter-spacing:1.5px;text-transform:uppercase;">Notes &amp; Observations</p>
            </td>
          </tr>

          <!-- Notes table -->
          <tr>
            <td style="padding:0 36px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e9e0d0;">
                ${noteRows || `<tr><td style="padding:16px;font-size:13px;color:#999;text-align:center;font-style:italic;">No notes recorded.</td></tr>`}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <hr style="border:none;border-top:1px solid #e9e0d0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                      This email was sent from the <strong style="color:#6b4e15;">Indian Art Villa Dashboard</strong><br />
                      Powered by <strong style="color:#6b4e15;">Ideate Consultancy</strong>
                    </p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:10px;color:#bbb;">Auto-generated · Do not reply</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { month, notes } = body as { month: string; notes: string };

    if (!month || !notes?.trim()) {
      return NextResponse.json({ error: "Month and notes are required." }, { status: 400 });
    }

    const sentAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = buildHtml(month, notes, sentAt);

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: RECIPIENTS,
      subject: `IAV Notes — ${month}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message ?? "Email send failed." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("Notes send error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
