import { Router, Request, Response } from "express";
import { processIncomingMessage } from "../services/ingestionService";

const router = Router();

function isWhatsAppConfigured(): boolean {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return Boolean(token && phoneId && token.trim() !== "");
}

// GET /api/whatsapp/status
router.get("/status", (req: Request, res: Response) => {
  const configured = isWhatsAppConfigured();
  return res.json({
    integration: "WhatsApp Business API",
    connected: configured,
    status: configured ? "Connected (Meta Cloud API active)" : "Awaiting Meta WhatsApp Business API Credentials",
    webhookUrl: `${process.env.APP_URL || "http://localhost:3000"}/api/whatsapp/webhook`,
    verifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    requiredEnvironmentVariables: [
      "WHATSAPP_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_VERIFY_TOKEN",
    ],
    setupGuide: configured
      ? "Meta WhatsApp webhook verified and receiving live messages."
      : "1. Create a Meta for Developers account and WhatsApp App. 2. Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_VERIFY_TOKEN in .env. 3. Configure webhook URL in Meta App Dashboard: https://your-domain.com/api/whatsapp/webhook.",
  });
});

// GET /api/whatsapp/webhook - Standard Meta Webhook Handshake Verification
router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "resolveai_whatsapp_webhook_secret_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verification challenge passed successfully.");
    return res.status(200).send(challenge);
  } else {
    console.warn("[WhatsApp Webhook] Verification token mismatch.");
    return res.status(403).send("Forbidden: Verification token mismatch");
  }
});

// POST /api/whatsapp/webhook - Receives incoming WhatsApp messages from Meta or test payload
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Check if this is a standard Meta Cloud API payload
    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const fromPhone = msg.from; // e.g. "919876543210"
              const contact = value.contacts?.find((c: any) => c.wa_id === fromPhone);
              const senderName = contact?.profile?.name || `Customer (${fromPhone})`;

              let messageText = "";
              if (msg.type === "text") {
                messageText = msg.text?.body || "";
              } else if (msg.type === "button") {
                messageText = msg.button?.text || "";
              } else if (msg.type === "interactive") {
                messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
              }

              if (messageText) {
                await processIncomingMessage({
                  source: "WhatsApp",
                  externalMessageId: msg.id || `wa-${Date.now()}`,
                  senderName,
                  senderPhone: fromPhone,
                  subject: `WhatsApp Support Message from ${senderName}`,
                  message: messageText,
                  rawData: msg,
                });
              }
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    }

    // Direct / Test normalized payload
    if (body.message) {
      const result = await processIncomingMessage({
        source: "WhatsApp",
        externalMessageId: body.externalMessageId || `wa-${Date.now()}`,
        senderName: body.senderName || "WhatsApp Customer",
        senderPhone: body.senderPhone || "+91 98765 43210",
        subject: body.subject || "Customer Complaint via WhatsApp",
        message: body.message,
        rawData: body,
      });
      return res.status(201).json({ message: "WhatsApp message ingested.", result });
    }

    return res.status(200).send("EVENT_RECEIVED");
  } catch (error: any) {
    console.error("WhatsApp webhook processing error:", error);
    return res.status(500).json({ error: "Failed to process WhatsApp event." });
  }
});

export default router;
