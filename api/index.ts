import app, { ensureDbInitialized } from "../server/app";

// Ensure database connection is triggered on Vercel cold starts
ensureDbInitialized().catch((err) => {
  console.warn("Vercel DB initialization on cold start:", err);
});

export default app;
