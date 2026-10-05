import { Router, Request, Response } from "express";
import { query, isDbConnected } from "../config/db";

const router = Router();

const CATEGORY_ICONS: Record<string, string> = {
  "Product Quality Issues": "📦",
  "Product Quality": "📦",
  "Logistics & Delivery": "🚚",
  "Delivery": "🚚",
  "Payment & Gateway Exceptions": "💳",
  "Payment": "💳",
  "Refund & Compensation": "↩️",
  "Refund": "↩️",
  "Customer Support Delays": "🎧",
  "Customer Support": "🎧",
  "Platform Technical Glitches": "⚙️",
  "Technical": "⚙️",
  "Accounts & Authentication": "🔐",
  "Account": "🔐",
  "Other": "📁",
};

// GET /api/categories
router.get("/", async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      return res.json({
        categories: [
          { icon: "📦", name: "Product Quality Issues", total: 12400, repeated: 5100, sev: "med", ai: "Most complaints relate to items not matching listed catalog descriptions or arriving without components." },
          { icon: "🚚", name: "Logistics & Delivery", total: 15000, repeated: 9000, sev: "high", ai: "Most users complain about delayed shipping times and lack of carrier responsiveness in metro centers." },
          { icon: "💳", name: "Payment & Gateway Exceptions", total: 6200, repeated: 3400, sev: "crit", ai: "Recurring checkout transaction failures are traced to third-party secure token timeout database locks." },
          { icon: "↩️", name: "Refund & Compensation", total: 8100, repeated: 4700, sev: "med", ai: "Refund delays averaging 15+ business days remain the leading qualitative driver of customer dissatisfaction." },
          { icon: "🎧", name: "Customer Support Delays", total: 5300, repeated: 1900, sev: "low", ai: "Live support wait times spike heavily during peak early evening slots, specifically 6 PM to 9 PM." },
          { icon: "⚙️", name: "Platform Technical Glitches", total: 4100, repeated: 2200, sev: "med", ai: "App freeze logs clustered significantly following the v2.4.1 binary update, mostly on Android OS." },
          { icon: "🔐", name: "Accounts & Authentication", total: 3900, repeated: 2600, sev: "high", ai: "Sync mismatches prevent customers from logging into saved profiles, forcing redundant account resets." },
        ],
      });
    }

    const catResult = await query(`
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        COUNT(comp.complaint_id) as total_signals,
        COUNT(comp.complaint_id) FILTER (WHERE ai.repeated_issue = true) as repeated_signals,
        MODE() WITHIN GROUP (ORDER BY comp.severity) as predominant_severity,
        (SELECT ai2.ai_recommendation FROM complaints comp2 
         JOIN source_messages sm2 ON comp2.message_id = sm2.message_id
         JOIN ai_analyses ai2 ON sm2.message_id = ai2.message_id
         WHERE comp2.category_id = c.category_id ORDER BY comp2.created_at DESC LIMIT 1) as recent_ai_rec
      FROM categories c
      LEFT JOIN complaints comp ON c.category_id = comp.category_id
      LEFT JOIN source_messages sm ON comp.message_id = sm.message_id
      LEFT JOIN ai_analyses ai ON sm.message_id = ai.message_id
      GROUP BY c.category_id, c.category_name, c.description
      ORDER BY total_signals DESC, c.category_id ASC
    `);

    const formattedCategories = catResult.rows.map(row => {
      const sevMap: Record<string, "crit" | "high" | "med" | "low"> = {
        Critical: "crit",
        High: "high",
        Medium: "med",
        Low: "low",
      };
      const sev = sevMap[row.predominant_severity] || "med";
      const icon = CATEGORY_ICONS[row.category_name] || "📁";

      return {
        id: row.category_id,
        icon,
        name: row.category_name,
        total: parseInt(row.total_signals || "0", 10),
        repeated: parseInt(row.repeated_signals || "0", 10),
        sev,
        ai: row.recent_ai_rec || row.description || `Automated analysis for ${row.category_name} tickets.`,
      };
    });

    return res.json({ categories: formattedCategories });
  } catch (error: any) {
    console.error("Error in GET /api/categories:", error);
    return res.status(500).json({ error: "Failed to fetch categories." });
  }
});

export default router;
