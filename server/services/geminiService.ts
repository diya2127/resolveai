import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface ComplaintAnalysisResult {
  sentiment: "Positive" | "Neutral" | "Negative";
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  repeatedIssue: boolean;
  summary: string;
  recommendation: string;
  confidence: number;
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: apiKey.trim(),
        });
      } catch (err) {
        console.warn("Failed to initialize GoogleGenAI client:", err);
      }
    }
  }
  return aiClient;
}

// Fallback heuristic classification when Gemini API is unavailable or rate-limited
export function heuristicAnalyze(text: string, subject?: string, rating?: number | null): ComplaintAnalysisResult {
  const combined = `${subject || ""} ${text}`.toLowerCase();
  
  // Category detection
  let category = "Other";
  if (combined.includes("refund") || combined.includes("money back") || combined.includes("cashback")) {
    category = "Refund";
  } else if (combined.includes("pay") || combined.includes("charge") || combined.includes("transaction") || combined.includes("deduct") || combined.includes("card") || combined.includes("upi")) {
    category = "Payment";
  } else if (combined.includes("deliver") || combined.includes("late") || combined.includes("courier") || combined.includes("tracking") || combined.includes("ship") || combined.includes("package")) {
    category = "Delivery";
  } else if (combined.includes("defect") || combined.includes("broken") || combined.includes("damage") || combined.includes("quality") || combined.includes("fake") || combined.includes("color")) {
    category = "Product Quality";
  } else if (combined.includes("login") || combined.includes("password") || combined.includes("otp") || combined.includes("account") || combined.includes("profile")) {
    category = "Account";
  } else if (combined.includes("crash") || combined.includes("bug") || combined.includes("error") || combined.includes("frozen") || combined.includes("glitch") || combined.includes("app")) {
    category = "Technical";
  }

  // Severity detection
  let severity: "Low" | "Medium" | "High" | "Critical" = "Medium";
  if (
    combined.includes("urgent") ||
    combined.includes("emergency") ||
    combined.includes("stolen") ||
    combined.includes("fraud") ||
    combined.includes("illegal") ||
    combined.includes("double charge") ||
    (combined.includes("failed") && combined.includes("payment"))
  ) {
    severity = "Critical";
  } else if (
    combined.includes("delay") ||
    combined.includes("not received") ||
    combined.includes("damaged") ||
    combined.includes("broken") ||
    combined.includes("unacceptable") ||
    (rating !== undefined && rating !== null && rating <= 2)
  ) {
    severity = "High";
  } else if (rating !== undefined && rating !== null && rating >= 4) {
    severity = "Low";
  }

  // Sentiment detection
  let sentiment: "Positive" | "Neutral" | "Negative" = "Negative";
  if (rating !== undefined && rating !== null && rating >= 4) {
    sentiment = "Positive";
  } else if (combined.includes("good") && !combined.includes("not good")) {
    sentiment = "Positive";
  } else if (combined.includes("inquiry") || combined.includes("question") || combined.includes("how to")) {
    sentiment = "Neutral";
  }

  // Summary and recommendation
  const summary = text.length > 120 ? text.substring(0, 117) + "..." : text;
  let recommendation = `Route to ${category} department for prioritized review.`;
  if (category === "Payment") {
    recommendation = "Verify transaction reference in payment gateway ledger and initiate reversal if duplicate.";
  } else if (category === "Refund") {
    recommendation = "Audit finance queue backlog and confirm bank credit disbursement ETA.";
  } else if (category === "Delivery") {
    recommendation = "Cross-reference tracking code with logistics hub dispatcher and notify customer of updated arrival.";
  } else if (category === "Product Quality") {
    recommendation = "Request damaged item photos and trigger replacement dispatch.";
  }

  return {
    sentiment,
    category,
    severity,
    repeatedIssue: false,
    summary,
    recommendation,
    confidence: 0.88,
  };
}

export async function analyzeComplaint(
  text: string,
  subject?: string,
  rating?: number | null,
  repeatedFlagHint: boolean = false
): Promise<ComplaintAnalysisResult> {
  const client = getAiClient();

  // If no Gemini client, run robust heuristic classification
  if (!client) {
    const res = heuristicAnalyze(text, subject, rating);
    res.repeatedIssue = repeatedFlagHint;
    return res;
  }

  try {
    const prompt = `You are the ResolveAI Complaint Intelligence Engine. Analyze the following customer message/feedback and output ONLY valid JSON adhering strictly to the schema below.
DO NOT wrap with markdown code fences (like \`\`\`json). Output pure JSON.

SCHEMA:
{
  "sentiment": "Positive" | "Neutral" | "Negative",
  "category": "Delivery" | "Refund" | "Payment" | "Product Quality" | "Technical" | "Account" | "Other",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "repeatedIssue": boolean,
  "summary": "Concise 1-2 sentence description of the core problem",
  "recommendation": "Concrete actionable next step for the resolving employee",
  "confidence": number between 0.50 and 1.00
}

INPUT:
Subject: ${subject || "N/A"}
Customer Message: ${text}
Rating: ${rating !== undefined && rating !== null ? rating : "N/A"}
Repeated Signal Pattern Detected: ${repeatedFlagHint ? "YES" : "NO"}
`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out after 8s")), 8000)
    );

    const response: any = await Promise.race([
      client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      }),
      timeoutPromise,
    ]);

    const responseText = response.text?.trim() || "";
    // Clean potential markdown blocks
    const cleanedJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);

    // Validate enum values
    const validSentiments = ["Positive", "Neutral", "Negative"];
    const validSeverities = ["Low", "Medium", "High", "Critical"];
    const validCategories = ["Delivery", "Refund", "Payment", "Product Quality", "Technical", "Account", "Other"];

    return {
      sentiment: validSentiments.includes(parsed.sentiment) ? parsed.sentiment : "Negative",
      category: validCategories.includes(parsed.category) ? parsed.category : "Other",
      severity: validSeverities.includes(parsed.severity) ? parsed.severity : "Medium",
      repeatedIssue: typeof parsed.repeatedIssue === "boolean" ? parsed.repeatedIssue : repeatedFlagHint,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : (text.substring(0, 100) + "..."),
      recommendation: typeof parsed.recommendation === "string" && parsed.recommendation.trim() ? parsed.recommendation.trim() : "Review and resolve as per standard operating procedure.",
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0.5, parsed.confidence)) : 0.95,
    };
  } catch (error) {
    console.warn("Gemini API call failed, using intelligent fallback analysis:", error);
    const fallback = heuristicAnalyze(text, subject, rating);
    fallback.repeatedIssue = repeatedFlagHint;
    return fallback;
  }
}

// Generates an empathetic resolution reply for agents to send to customers
export async function generateResolutionDraft(
  customerName: string,
  issueDescription: string,
  channel: string = "WhatsApp"
): Promise<string> {
  const client = getAiClient();
  const prompt = `You are a helpful customer support resolution specialist at an enterprise company.
A customer named "${customerName || 'Customer'}" reached out via ${channel} with this complaint:
"${issueDescription}"

Draft a polite, empathetic, concise resolution reply for them.
- If channel is WhatsApp: Keep it short (under 75 words), empathetic, professional, formatted nicely with clean emoji.
- If channel is Gmail/Email: Include a polite greeting, clear explanation of the resolution steps, and a warm closing.
Do NOT include generic bracketed placeholders like [Your Name] or [Company Name] — sign off as "Customer Care Team".`;

  if (client) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini draft timed out after 6s")), 6000)
      );

      const response: any = await Promise.race([
        client.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
        }),
        timeoutPromise,
      ]);
      if (response.text) return response.text.trim();
    } catch (e) {
      console.warn("Gemini draft reply error:", e);
    }
  }

  // Fallback templates
  if (channel.toLowerCase().includes("whatsapp")) {
    return `Hello ${customerName || 'there'}, thank you for contacting us. We apologize for the inconvenience regarding: "${issueDescription.substring(0, 50)}...". Our operations team has reviewed your ticket and initiated corrective action. You will receive tracking/refund confirmation shortly. Best regards, Customer Care Team`;
  }
  return `Dear ${customerName || 'Valued Customer'},\n\nThank you for reaching out to us. We have reviewed your issue regarding "${issueDescription.substring(0, 60)}..." and our operations team has taken immediate corrective action to resolve it.\n\nPlease let us know if you need any further assistance.\n\nWarm regards,\nCustomer Care Operations`;
}
