import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import app, { ensureDbInitialized } from "./server/app";

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  console.log("Initializing ResolveAI Database Connection...");
  await ensureDbInitialized();

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
