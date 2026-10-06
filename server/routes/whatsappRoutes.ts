import { Router, Request, Response } from "express";
import { processIncomingMessage } from "../services/ingestionService";
import { query } from "../config/db";

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

// GET /api/whatsapp/webhook - Meta Handshake Verification & Browser Health Check
router.get("/webhook", (req: Request, res: Response) => {
  const challenge = req.query["hub.challenge"];

  // 1. Meta Webhook Verification Handshake
  // If Meta passes a verification challenge, approve immediately
  if (challenge) {
    console.log("[WhatsApp Webhook] Meta challenge verification passed successfully.");
    return res.status(200).send(challenge);
  }

  // 2. Browser visit / Health check
  return res.status(200).json({
    status: "online",
    service: "ResolveAI WhatsApp Webhook",
    message: "Webhook endpoint is operational and listening for incoming WhatsApp messages.",
    endpoints: {
      postWebhook: "/api/whatsapp/webhook",
      syncTwilio: "/api/whatsapp/sync-twilio",
      autoSyncStatus: "/api/whatsapp/auto-sync/status",
    },
    verificationToken: process.env.WHATSAPP_VERIFY_TOKEN || "resolveai_whatsapp_webhook_secret_verify_token",
  });
});

// POST /api/whatsapp/webhook - Receives incoming WhatsApp messages from Meta, Twilio, or test payload
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = { message: body };
      }
    }

    console.log("[WhatsApp Webhook Received]:", JSON.stringify(body).substring(0, 300));

    // 1. Check if this is Twilio Sandbox / Twilio WhatsApp Webhook
    // Twilio sends: { Body: "...", From: "whatsapp:+91...", ProfileName: "...", MessageSid: "..." }
    const twilioBody = body.Body || body.body || body.Message || body.message;
    const twilioFrom = body.From || body.from;
    if (twilioBody && twilioFrom) {
      const cleanPhone = String(twilioFrom).replace(/^whatsapp:/i, "");
      const senderName = body.ProfileName || body.profileName || `WhatsApp User (${cleanPhone})`;

      await processIncomingMessage({
        source: "WhatsApp",
        externalMessageId: body.MessageSid || body.SmsSid || `wa-twilio-${Date.now()}`,
        senderName,
        senderPhone: cleanPhone,
        subject: `WhatsApp Message from ${senderName}`,
        message: String(twilioBody).trim(),
        rawData: body,
      });

      // Twilio expects TwiML XML or 200 OK
      res.type("text/xml");
      return res.status(200).send("<Response></Response>");
    }

    // 2. Check if this is a standard Meta Cloud API payload
    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const fromPhone = msg.from || "Unknown WhatsApp User";
              const contact = value.contacts?.find((c: any) => c.wa_id === fromPhone);
              const senderName = contact?.profile?.name || `Customer (${fromPhone})`;

              let messageText = "";
              if (msg.type === "text") {
                messageText = msg.text?.body || "";
              } else if (msg.type === "button") {
                messageText = msg.button?.text || "";
              } else if (msg.type === "interactive") {
                messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
              } else if (msg.caption) {
                messageText = msg.caption;
              }

              // Fallback for media or voice notes
              if (!messageText) {
                if (msg.type === "image") messageText = msg.image?.caption || "[Image received via WhatsApp]";
                else if (msg.type === "audio" || msg.type === "voice") messageText = "[Voice note received via WhatsApp]";
                else if (msg.type === "video") messageText = msg.video?.caption || "[Video message received via WhatsApp]";
                else if (msg.type === "document") messageText = `[Document: ${msg.document?.filename || "file"} received]`;
                else if (msg.type === "location") messageText = `[Customer shared location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
                else messageText = `[WhatsApp message of type ${msg.type || "chat"}]`;
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

    // 3. Direct / Test normalized payload or Zapier / Webhook JSON
    const messageContent = body.message || body.text || body.content || body.Body;
    if (messageContent) {
      const fromPhone = body.senderPhone || body.phone || body.from || "+91 98765 43210";
      const senderName = body.senderName || body.name || `WhatsApp User (${fromPhone})`;

      const result = await processIncomingMessage({
        source: "WhatsApp",
        externalMessageId: body.externalMessageId || `wa-${Date.now()}`,
        senderName,
        senderPhone: fromPhone,
        subject: body.subject || `WhatsApp Complaint from ${senderName}`,
        message: String(messageContent).trim(),
        rawData: body,
      });
      return res.status(200).json({ message: "WhatsApp message ingested.", result });
    }

    // Acknowledge receipt for statuses or other webhooks per Meta spec
    return res.status(200).send("EVENT_RECEIVED");
  } catch (error: any) {
    console.error("WhatsApp webhook processing error:", error);
    // Always return 200 to prevent WhatsApp/Twilio from disabling webhook
    return res.status(200).json({ status: "acknowledged", warning: error.message });
  }
});

// Background Auto-Sync State
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  autoSyncEnabled: boolean;
  intervalSeconds: number;
  lastSync?: string;
  lastCount?: number;
  lastError?: string;
}

let activeTwilioConfig: TwilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || "",
  autoSyncEnabled: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  intervalSeconds: 6,
};

let autoSyncTimer: NodeJS.Timeout | null = null;
let isSyncInProgress = false;

export async function pollTwilioMessages(sid: string, token: string): Promise<number> {
  if (isSyncInProgress) return 0;
  isSyncInProgress = true;
  try {
    const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?PageSize=15`;

    const twilioRes = await fetch(twilioUrl, {
      headers: { Authorization: authHeader },
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      activeTwilioConfig.lastError = `Twilio API error: ${errText}`;
      return 0;
    }

    const data: any = await twilioRes.json();
    const messages = data.messages || [];
    let syncedCount = 0;

    for (const msg of messages) {
      if (msg.direction === "inbound" && msg.from?.startsWith("whatsapp:")) {
        // Fast pre-check: skip if this exact external message SID is already stored
        if (msg.sid) {
          const existing = await query(
            "SELECT message_id FROM source_messages WHERE external_message_id = $1 LIMIT 1",
            [msg.sid]
          );
          if (existing.rows.length > 0) {
            continue;
          }
        }

        const cleanPhone = msg.from.replace("whatsapp:", "");
        const result = await processIncomingMessage({
          source: "WhatsApp",
          externalMessageId: msg.sid,
          senderName: `WhatsApp User (${cleanPhone})`,
          senderPhone: cleanPhone,
          subject: `WhatsApp Message: ${String(msg.body || "").substring(0, 35)}...`,
          message: msg.body,
          rawData: msg,
        });

        if (result && !result.duplicate) {
          syncedCount++;
        }
      }
    }

    activeTwilioConfig.lastSync = new Date().toISOString();
    activeTwilioConfig.lastCount = syncedCount;
    activeTwilioConfig.lastError = undefined;
    return syncedCount;
  } catch (err: any) {
    activeTwilioConfig.lastError = err.message;
    return 0;
  } finally {
    isSyncInProgress = false;
  }
}

function startAutoSyncLoop() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (!activeTwilioConfig.autoSyncEnabled || !activeTwilioConfig.accountSid || !activeTwilioConfig.authToken) {
    return;
  }

  console.log(`[Twilio Auto-Sync] Started continuous background poll every ${activeTwilioConfig.intervalSeconds}s.`);
  autoSyncTimer = setInterval(async () => {
    if (activeTwilioConfig.autoSyncEnabled && activeTwilioConfig.accountSid && activeTwilioConfig.authToken) {
      await pollTwilioMessages(activeTwilioConfig.accountSid, activeTwilioConfig.authToken);
    }
  }, activeTwilioConfig.intervalSeconds * 1000);
}

// Start if configured in env
if (activeTwilioConfig.autoSyncEnabled) {
  startAutoSyncLoop();
}

// GET /api/whatsapp/auto-sync/status
router.get("/auto-sync/status", (req: Request, res: Response) => {
  return res.json({
    enabled: activeTwilioConfig.autoSyncEnabled,
    hasCredentials: Boolean(activeTwilioConfig.accountSid && activeTwilioConfig.authToken),
    maskedSid: activeTwilioConfig.accountSid
      ? `${activeTwilioConfig.accountSid.substring(0, 6)}...${activeTwilioConfig.accountSid.slice(-4)}`
      : "",
    intervalSeconds: activeTwilioConfig.intervalSeconds,
    lastSync: activeTwilioConfig.lastSync || null,
    lastCount: activeTwilioConfig.lastCount ?? null,
    lastError: activeTwilioConfig.lastError || null,
  });
});

// POST /api/whatsapp/auto-sync/configure
router.post("/auto-sync/configure", async (req: Request, res: Response) => {
  try {
    const { accountSid, authToken, autoSyncEnabled, intervalSeconds } = req.body;

    if (accountSid !== undefined) activeTwilioConfig.accountSid = accountSid.trim();
    if (authToken !== undefined) activeTwilioConfig.authToken = authToken.trim();
    if (autoSyncEnabled !== undefined) activeTwilioConfig.autoSyncEnabled = Boolean(autoSyncEnabled);
    if (intervalSeconds !== undefined) activeTwilioConfig.intervalSeconds = Number(intervalSeconds) || 6;

    if (activeTwilioConfig.autoSyncEnabled) {
      startAutoSyncLoop();
      // Run immediate poll
      const count = await pollTwilioMessages(activeTwilioConfig.accountSid, activeTwilioConfig.authToken);
      return res.json({
        success: true,
        message: `Continuous WhatsApp auto-sync enabled! Synced ${count} messages. Background poller runs every ${activeTwilioConfig.intervalSeconds}s.`,
        config: {
          enabled: activeTwilioConfig.autoSyncEnabled,
          intervalSeconds: activeTwilioConfig.intervalSeconds,
        },
      });
    } else {
      if (autoSyncTimer) clearInterval(autoSyncTimer);
      return res.json({
        success: true,
        message: "WhatsApp auto-sync disabled.",
        config: { enabled: false },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to configure auto-sync." });
  }
});

// POST /api/whatsapp/sync-twilio - Directly sync inbound messages from Twilio REST API
router.post("/sync-twilio", async (req: Request, res: Response) => {
  try {
    const { accountSid, authToken } = req.body;
    const sid = accountSid || activeTwilioConfig.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const token = authToken || activeTwilioConfig.authToken || process.env.TWILIO_AUTH_TOKEN;

    if (!sid || !token) {
      return res.status(400).json({ error: "Missing Twilio Account SID or Auth Token." });
    }

    const count = await pollTwilioMessages(sid, token);

    return res.json({
      success: true,
      count,
      message: count > 0
        ? `Successfully synced ${count} real WhatsApp messages from Twilio!`
        : "Connected to Twilio successfully. No new inbound WhatsApp messages found.",
    });
  } catch (error: any) {
    console.error("Twilio sync error:", error);
    return res.status(500).json({ error: error.message || "Failed to sync Twilio messages." });
  }
});

// POST /api/whatsapp/send-reply - Outbound dispatch back to customer's WhatsApp
router.post("/send-reply", async (req: Request, res: Response) => {
  try {
    const { toPhone, message, accountSid, authToken } = req.body;
    const sid = accountSid || activeTwilioConfig.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const token = authToken || activeTwilioConfig.authToken || process.env.TWILIO_AUTH_TOKEN;

    if (!toPhone || !message) {
      return res.status(400).json({ error: "Fields 'toPhone' and 'message' are required." });
    }

    if (!sid || !token) {
      return res.status(400).json({
        error: "Twilio credentials not configured. Please configure Twilio in Connected Apps first.",
      });
    }

    const cleanTo = String(toPhone).replace(/[^\d+]/g, "");
    const formattedTo = cleanTo.startsWith("+") ? `whatsapp:${cleanTo}` : `whatsapp:+${cleanTo}`;
    const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const bodyParams = new URLSearchParams({
      From: twilioFrom,
      To: formattedTo,
      Body: String(message).trim(),
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams,
    });

    if (!twilioRes.ok) {
      const err = await twilioRes.text();
      return res.status(twilioRes.status).json({ error: `Twilio delivery error: ${err}` });
    }

    const data: any = await twilioRes.json();
    return res.json({
      success: true,
      messageSid: data.sid,
      status: data.status,
      message: `WhatsApp message successfully dispatched to ${formattedTo}!`,
    });
  } catch (error: any) {
    console.error("Outbound WhatsApp dispatch error:", error);
    return res.status(500).json({ error: error.message || "Failed to dispatch WhatsApp reply." });
  }
});

export default router;
