import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { processIncomingMessage } from "../services/ingestionService";

const router = Router();

// POST /api/ecommerce/sync - Ingests reviews from mock-ecommerce/reviews.json through the common pipeline
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const reviewsPath = path.join(process.cwd(), "mock-ecommerce", "reviews.json");
    const fallbackPath = path.join(process.cwd(), "mock-ecommerce", "review.json");
    
    let filePath = reviewsPath;
    if (!fs.existsSync(reviewsPath)) {
      filePath = fallbackPath;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "E-commerce data file not found." });
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const reviews = JSON.parse(fileContent);

    if (!Array.isArray(reviews)) {
      return res.status(400).json({ error: "Invalid reviews format: expected JSON array." });
    }

    const processedResults = [];

    for (const review of reviews) {
      try {
        const result = await processIncomingMessage({
          source: "E-Commerce",
          externalMessageId: review.id || `ecomm-${Date.now()}`,
          senderName: review.customer_name || "Anonymous Shopper",
          senderEmail: review.customer_email || null,
          subject: review.review_title || `E-Commerce Feedback for ${review.product || 'Product'}`,
          message: review.review_text || review.review_title || "No text provided.",
          rating: review.rating !== undefined ? Number(review.rating) : null,
          product: review.product || null,
          rawData: review,
        });
        processedResults.push({ id: review.id, success: true, result });
      } catch (err: any) {
        processedResults.push({ id: review.id, success: false, error: err.message });
      }
    }

    return res.json({
      message: `Synchronized ${processedResults.length} e-commerce records into ResolveAI common pipeline.`,
      processedCount: processedResults.length,
      details: processedResults,
    });
  } catch (error: any) {
    console.error("Error in POST /api/ecommerce/sync:", error);
    return res.status(500).json({ error: "Failed to synchronize e-commerce reviews." });
  }
});

// GET /api/ecommerce/status - Reports connection status
router.get("/status", async (req: Request, res: Response) => {
  return res.json({
    source: "E-Commerce",
    mode: "Simulated Source (mock-ecommerce/reviews.json)",
    liveApiConnected: false,
    note: "Modular architecture ready for Amazon Selling Partner API / Shopify Webhooks.",
  });
});

export default router;
