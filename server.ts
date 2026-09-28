import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: any = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// Local smart fallback generator in case API key is missing
function getLocalSmartFallback(prompt: string, tone: string, role: string, context: any): string {
  const t = prompt.toLowerCase();
  let baseReply = "";

  if (role === "employee") {
    if (t.includes("task") || t.includes("priority")) {
      baseReply = `### Assigned Workspace Queue Roadmap\n\nBased on classified customer logs, here is your target queue:\n1. **#4521 - Refund delay complaint** (High Priority, SLA warning)\n2. **#4522 - Metropolitan delivery backlogs** (High Priority)\n3. **#4523 - Concurrent payment capturing hold** (Medium Priority)\n\n*Action directive: Resolve refund delay #4521 first to clear critical billing holds.*`;
    } else if (t.includes("refund") && (t.includes("reply") || t.includes("draft") || t.includes("delay"))) {
      baseReply = `### Draft Template: Refund Delay Reponse\n\n"Subject: Update on your refund transaction — ResolveAI Support\n\nDear [Customer Name],\n\nI sincerely apologize for the delay in processing your credit. I completely understand how frustrating it is to wait for funds that belong to you.\n\nWe identified a temporary synchronization error with our payment gateway partner. I have manually authorized your refund, and it will reflect in your account within 2-3 business days. Thank you for your patience."`;
    } else if (t.includes("delivery") || t.includes("late")) {
      baseReply = `### Operating Guideline: Resolving Late Deliveries\n\n1. Cross-reference shipping tracking codes with carrier APIs.\n2. If package is stuck > 48 hours at metro cargo sorting hubs, submit escalation ticket.\n3. Send late delivery apology template to the customer.\n4. Save carrier resolution ID in task notes.`;
    } else {
      baseReply = `I am ResolveAI's active support copilot. I can assist with:\n- Drafting responsive email templates\n- Detailing ticket SOP guidelines\n- Reviewing active queue tasks (#4523, #4524)`;
    }
  } else {
    if (t.includes("major") || t.includes("today") || t.includes("issue") || t.includes("trend")) {
      baseReply = `### Live Corporate Anomalies Report (Today)\n\n1. **Payment exceptions (Critical)**: 340 customer reports. regional gateway success dropped to 68%.\n2. **Logistics Terminal backing (High)**: 9,000 complaints logged. metro hub processing delay.\n3. **App reset errors (Medium)**: Password synchronization issue resolved. Android patch deployed.`;
    } else if (t.includes("department") || t.includes("performance") || t.includes("sla")) {
      baseReply = `### Department Resolution Metrics:\n- **Customer Support Unit**: 88% resolved (Standard SLA met)\n- **Accounts & Billing Unit**: 82% resolved (Standard SLA met)\n- **Logistics Delivery Unit**: 78% resolved\n- **Finance / Refunds Unit**: 65% resolved (🚨 Backlog Alert)\n\n*Strategic fix: Recommend automating bank transfers to bypass finance backlogs.*`;
    } else if (t.includes("critical") || t.includes("alert")) {
      baseReply = `⚠️ **CRITICAL INCIDENT ALERT:**\n\nCheckout gateway timeouts are active. 340 checkout signals captured in past 2 hours. Suggest immediate engineering audit on billing API endpoints.`;
    } else {
      baseReply = `I am ResolveAI's Corporate Chatbot. I can synthesize:\n- SLA performance charts\n- Cumulative feedback trend tables\n- Predictive staffing suggestions`;
    }
  }

  // Inject a helpful configuration tip
  return `${baseReply}\n\n*Note: This query is utilizing ResolveAI's local model. To activate real-time Gemini processing, verify your GEMINI_API_KEY inside the Settings > Secrets tab of your AI Studio environment.*`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body Parsing Middleware
  app.use(express.json());

  // API Routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, tone, role, context } = req.body;
      
      const client = getAiClient();

      if (!client) {
        // Fall back gracefully if API Key is not set or placeholder
        const fallbackText = getLocalSmartFallback(prompt, tone, role, context);
        return res.json({ text: fallbackText });
      }

      // Context checks
      const systemInstruction = `You are "ResolveAI Chatbot", a highly sophisticated, real-time AI signal chatbot and feedback intelligence core.
The user is logged in as a ${role === "authority" ? "Administrator (Director / Executive Board)" : "Employee (Support Desk / Finance Unit)"}.
Your tone style should be adjusted to: ${
        tone === "empathetic"
          ? "Empathetic Customer Success Coach (prioritize drafting polite responses, templates, and helpful advice)"
          : tone === "actionable"
          ? "Action-Oriented Operator (provide crisp checklists, diagnostic procedures, and clear next steps)"
          : "Fact-heavy Data Analyst (focused on statistical metrics, root causes, and business SLA benchmarks)"
      }.

Available contexts linked to this query:
- Customer Feedback Logs Database: ${context?.useTickets ? "CONNECTED (active queries can search 50,000 real customer complaint patterns)" : "DISCONNECTED"}
- Category Analytics Engine: ${context?.useCategories ? "CONNECTED (SLA thresholds are product=80%, logistics=78%, payments=68%)" : "DISCONNECTED"}
- Department Performance Metrics: ${context?.useDb ? "CONNECTED (finance/refund department currently backlogged at 65%, support wait times spike 6 PM - 9 PM)" : "DISCONNECTED"}

Your goal is to provide extremely accurate, highly detailed, professional, and clear answers. Never expose internal API keys.
For customer responses, draft realistic templates.
For technical audits, list log diagnostics and recommended resolutions.
Keep responses concise, human-readable, and highly professional.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || "I was unable to synthesize a response. Let me try analyzing your query again.";
      res.json({ text });

    } catch (error: any) {
      console.error("Gemini API server exception:", error);
      res.status(500).json({ error: "Intelligence core exception. Try querying again." });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ResolveAI backend running on port ${PORT}`);
  });
}

startServer();
