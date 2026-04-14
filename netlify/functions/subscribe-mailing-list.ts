import type { Handler } from "@netlify/functions";
import { Resend } from "resend";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const handler: Handler = async (event) => {
  try {
    console.log("subscribe-mailing-list called");
    console.log("HTTP method:", event.httpMethod);

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAILING_LIST_TO_EMAIL = process.env.MAILING_LIST_TO_EMAIL;

    console.log("Has RESEND_API_KEY:", !!RESEND_API_KEY);
    console.log("MAILING_LIST_TO_EMAIL:", MAILING_LIST_TO_EMAIL);

    if (!RESEND_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing RESEND_API_KEY" }),
      };
    }

    if (!MAILING_LIST_TO_EMAIL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing MAILING_LIST_TO_EMAIL" }),
      };
    }

    const resend = new Resend(RESEND_API_KEY);

    let body: any = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    console.log("Request body:", body);

    const email = String(body.email || "").trim().toLowerCase();
    console.log("Parsed email:", email);

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid email address" }),
      };
    }

    const safeEmail = escapeHtml(email);

    const { data, error } = await resend.emails.send({
      from: "Vaal Exotics <onboarding@resend.dev>",
      to: MAILING_LIST_TO_EMAIL,
      subject: "New mailing list signup",
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2 style="margin-bottom: 12px;">New Mailing List Signup</h2>
          <p style="margin: 0 0 12px;">A new user has subscribed to the Vaal Exotics mailing list.</p>
          <p style="margin: 0;"><strong>Email:</strong> ${safeEmail}</p>
        </div>
      `,
      text: `New mailing list signup\n\nA new user has subscribed.\nEmail: ${email}`,
    });

    if (error) {
      console.error("Resend API error:", error);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to send email",
        }),
      };
    }

    console.log("Resend success:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Email sent successfully",
        id: data?.id ?? null,
      }),
    };
  } catch (error: any) {
    console.error("subscribe-mailing-list error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.message || "Internal server error",
      }),
    };
  }
};