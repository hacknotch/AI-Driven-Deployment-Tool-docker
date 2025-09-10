import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { verifyToken, getCurrentUser, upsertUserData, getUserHistory } from "./routes/auth";
import deploymentRoutes from "./routes/deployment";
import autoDeployRoutes from "./routes/autoDeploy";
import dockerMonitorRoutes from "./routes/dockerMonitor";
import dockerStatusRoutes from "./routes/dockerStatus";
import advancedDockerFixRoutes from "./routes/advancedDockerFix";
import dockerBuildFixRoutes from "./routes/dockerBuildFix";
import dockerAutoFixRoutes from "./routes/dockerAutoFix";
import langchainDockerFixRoutes from "./routes/langchainDockerFix";
import completeDockerFixRoutes from "./routes/completeDockerFix";
import { handleRAGQuery, testRAGConnection } from "./routes/ragBot";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Test endpoint for deployment routes
  app.get("/api/test", (_req, res) => {
    res.json({ 
      message: "Server is running", 
      timestamp: new Date().toISOString(),
      routes: ["/api/deployments", "/api/analyze-files", "/api/debug"]
    });
  });

  // Debug endpoint to check environment variables
  app.get("/api/debug/env", (_req, res) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    res.json({
      hasOpenAIKey: !!openaiKey,
      keyLength: openaiKey?.length || 0,
      keyStart: openaiKey ? openaiKey.substring(0, 15) + '...' : 'NOT_FOUND',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENAI'))
    });
  });

  // Environment check for intelligent file generation
  app.get("/api/debug/intelligent", (_req, res) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    const nodeEnv = process.env.NODE_ENV;
    
    res.json({
      status: 'checking intelligent file generation setup',
      openai: {
        hasKey: !!openaiKey,
        keyLength: openaiKey?.length || 0,
        keyStart: openaiKey ? openaiKey.substring(0, 15) + '...' : 'NOT_FOUND'
      },
      environment: {
        nodeEnv: nodeEnv || 'development',
        isProduction: nodeEnv === 'production'
      },
      services: {
        intelligentFileGenerator: 'available',
        aiService: 'available',
        deploymentRoutes: 'available'
      },
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/demo", handleDemo);

  // Supabase/Auth routes
  app.get("/api/user/profile", verifyToken, getCurrentUser);
  app.post("/api/user/data", verifyToken, upsertUserData);
  app.get("/api/user/history", verifyToken, getUserHistory);

  // Deployment routes
  app.use("/api", deploymentRoutes);
  
  // Auto-deployment routes
  app.use("/api/auto-deploy", autoDeployRoutes);
  
  // Docker monitor routes
  app.use("/api/docker-monitor", dockerMonitorRoutes);
  
  // Docker status routes
  app.use("/api/docker-status", dockerStatusRoutes);
  
  // Advanced Docker fix routes
  app.use("/api/advanced-docker-fix", advancedDockerFixRoutes);
  
  // Docker build fix routes
  app.use("/api", dockerBuildFixRoutes);
  
  // Docker auto-fix routes
  app.use("/api", dockerAutoFixRoutes);
  app.use("/api", langchainDockerFixRoutes);
  app.use("/api", completeDockerFixRoutes);

  // RAG Bot routes
  app.post("/api/rag-bot/query", handleRAGQuery);
  app.get("/api/rag-bot/test", testRAGConnection);

  return app;
}
