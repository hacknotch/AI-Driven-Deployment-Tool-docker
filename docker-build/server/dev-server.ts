import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "./index";

const app = createServer();
const port = process.env.SERVER_PORT || 3001; // Different port for development

app.listen(port, () => {
  console.log(`🚀 Development server running on port ${port}`);
  console.log(`🔧 API endpoints available at http://localhost:${port}/api`);
  console.log(`📊 Debug endpoints:`);
  console.log(`   - http://localhost:${port}/api/test`);
  console.log(`   - http://localhost:${port}/api/debug/env`);
  console.log(`   - http://localhost:${port}/api/debug/intelligent`);
  console.log(`   - http://localhost:${port}/api/debug`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
}); 