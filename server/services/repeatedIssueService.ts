import { query, isDbConnected } from "../config/db";

export interface RepeatedCheckInput {
  category?: string;
  product?: string | null;
  senderEmail?: string | null;
  subject?: string | null;
  messageContent: string;
}

export interface RepeatedCheckResult {
  isRepeated: boolean;
  matchCount: number;
  matchedReason?: string;
}

export async function detectRepeatedIssue(input: RepeatedCheckInput): Promise<RepeatedCheckResult> {
  if (!isDbConnected()) {
    return { isRepeated: false, matchCount: 0 };
  }

  try {
    // 1. Check if the same customer has reported an issue recently (past 30 days)
    if (input.senderEmail) {
      const customerMatches = await query(
        `SELECT COUNT(*) as count 
         FROM source_messages sm
         JOIN complaints c ON sm.message_id = c.message_id
         WHERE sm.sender_email = $1 
           AND sm.received_at > NOW() - INTERVAL '30 days'`,
        [input.senderEmail]
      );
      const count = parseInt(customerMatches.rows[0]?.count || "0", 10);
      if (count >= 1) {
        return {
          isRepeated: true,
          matchCount: count + 1,
          matchedReason: `Customer has ${count} existing recent complaint(s)`,
        };
      }
    }

    // 2. Check if the same product has multiple complaints in this category
    if (input.product && input.category) {
      const productMatches = await query(
        `SELECT COUNT(*) as count 
         FROM source_messages sm
         JOIN ai_analyses ai ON sm.message_id = ai.message_id
         WHERE LOWER(sm.product) = LOWER($1) 
           AND LOWER(ai.category) = LOWER($2)
           AND sm.received_at > NOW() - INTERVAL '60 days'`,
        [input.product, input.category]
      );
      const count = parseInt(productMatches.rows[0]?.count || "0", 10);
      if (count >= 2) {
        return {
          isRepeated: true,
          matchCount: count + 1,
          matchedReason: `Product "${input.product}" has ${count} previous reports in "${input.category}" category`,
        };
      }
    }

    // 3. Keyword / Topic frequency in recent complaints
    // Extract key words from subject or content
    const combined = `${input.subject || ""} ${input.messageContent}`.toLowerCase();
    const commonIssueKeywords = [
      "payment failed",
      "charged twice",
      "duplicate charge",
      "refund delay",
      "late delivery",
      "broken item",
      "damaged package",
      "cannot login",
      "otp not received",
      "order cancelled",
    ];

    for (const kw of commonIssueKeywords) {
      if (combined.includes(kw)) {
        const keywordMatches = await query(
          `SELECT COUNT(*) as count 
           FROM source_messages sm
           WHERE LOWER(sm.message_content) LIKE $1
             AND sm.received_at > NOW() - INTERVAL '14 days'`,
          [`%${kw}%`]
        );
        const count = parseInt(keywordMatches.rows[0]?.count || "0", 10);
        if (count >= 3) {
          return {
            isRepeated: true,
            matchCount: count + 1,
            matchedReason: `Cluster anomaly: Keyword "${kw}" reported ${count} times across the platform recently`,
          };
        }
      }
    }

    return { isRepeated: false, matchCount: 0 };
  } catch (error) {
    console.warn("Repeated issue detection encountered an error:", error);
    return { isRepeated: false, matchCount: 0 };
  }
}
