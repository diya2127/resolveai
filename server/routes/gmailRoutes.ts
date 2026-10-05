import { Router, Request, Response } from "express";
import { processIncomingMessage } from "../services/ingestionService";

const router = Router();

// Modular configuration check
function isGmailConfigured(): boolean {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  return Boolean(clientId && clientSecret && refreshToken && clientId.trim() !== "");
}

// GET /api/gmail/status
router.get("/status", (req: Request, res: Response) => {
  const configured = isGmailConfigured();
  return res.json({
    integration: "Gmail",
    connected: configured,
    status: configured ? "Connected (OAuth2 active)" : "Awaiting Google Cloud OAuth2 Credentials",
    requiredEnvironmentVariables: [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "GMAIL_REDIRECT_URI",
    ],
    setupGuide: configured
      ? "Gmail API credentials active and ready for inbox polling."
      : "1. Create a Google Cloud Project and enable Gmail API. 2. Create OAuth 2.0 Client ID Credentials. 3. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env. 4. Complete OAuth authorization to generate GMAIL_REFRESH_TOKEN.",
  });
});

// POST /api/gmail/webhook - For Google Cloud Pub/Sub push notifications or modular email ingestion
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const { from, subject, body, messageId, date, headers } = req.body;

    if (!body && !subject) {
      return res.status(400).json({ error: "Email body or subject is required." });
    }

    // Parse email sender name and email
    let senderName = from || "Email Customer";
    let senderEmail = from || null;
    if (from && from.includes("<") && from.includes(">")) {
      const match = from.match(/^(.*?)\s*<(.*?)>$/);
      if (match) {
        senderName = match[1].replace(/['"]/g, "").trim();
        senderEmail = match[2].trim();
      }
    }

    // Normalize email into Common Ingestion Pipeline
    const ingestionResult = await processIncomingMessage({
      source: "Gmail",
      externalMessageId: messageId || `gmail-${Date.now()}`,
      senderName,
      senderEmail,
      subject: subject || "Inquiry from Customer via Email",
      message: body || subject,
      rawData: { from, subject, date, headers },
    });

    return res.status(201).json({
      message: "Email successfully normalized and processed via ResolveAI Ingestion Layer.",
      result: ingestionResult,
    });
  } catch (error: any) {
    console.error("Gmail webhook ingestion error:", error);
    return res.status(500).json({ error: "Failed to process incoming email message." });
  }
});

// GET /api/gmail/oauth/callback - Modular OAuth2 callback handler
router.get("/oauth/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`OAuth authorization error: ${error}`);
  }

  if (!code) {
    return res.status(400).send("No authorization code provided in callback.");
  }

  return res.send(`
    <h2>Gmail OAuth Code Received</h2>
    <p>Authorization code received successfully. Set your GMAIL_REFRESH_TOKEN in .env to finalize configuration.</p>
  `);
});

export default router;
