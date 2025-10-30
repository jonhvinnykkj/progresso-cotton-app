import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  loginSchema,
  createUserSchema,
  batchCreateBalesSchema,
  updateBaleStatusSchema,
  updateDefaultSafraSchema,
} from "@shared/schema";
import { addClient, notifyBaleChange, notifyVersionUpdate } from "./events";
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
  authorizeRoles,
} from "./auth";
import rateLimit from "express-rate-limit";

// Extend Express Request with JWT payload
interface JWTPayload {
  userId: string;
  username: string;
  roles: string[];
}

declare module "express-serve-static-core" {
  interface Request {
    user?: JWTPayload;
  }
}
import { z } from "zod";
import { generatePDF, generateExcel } from "./reports";

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window (increased for development)
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Version endpoint for client auto-update detection
  const APP_VERSION = process.env.RAILWAY_DEPLOYMENT_ID || Date.now().toString();

  app.get("/api/version", (_req, res) => {
    res.json({
      version: APP_VERSION,
      timestamp: Date.now()
    });
  });

  // Server-Sent Events endpoint for real-time updates
  app.get("/api/events", (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // CORS headers for SSE
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.flushHeaders();

    addClient(res);

    // Send initial connection message
    res.write('event: connected\ndata: {"message":"Connected to real-time updates"}\n\n');

    // Send current version to newly connected client
    res.write(`event: version-update\ndata: ${JSON.stringify({ version: APP_VERSION, timestamp: Date.now() })}\n\n`);

    // Send keepalive every 30 seconds to prevent connection timeout
    const keepaliveInterval = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 30000);

    // Clean up on connection close
    req.on('close', () => {
      clearInterval(keepaliveInterval);
    });
  });

  // Auth routes
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({
          error: "Credenciais inválidas",
        });
      }

      // Verify password using bcrypt
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Credenciais inválidas",
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const { password: _, ...userWithoutPassword } = user;

      // Parse roles do JSON
      const availableRoles: string[] = user.roles ? JSON.parse(user.roles) : [];

      res.json({
        ...userWithoutPassword,
        availableRoles, // Adiciona array de papéis disponíveis
        accessToken,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      res.status(500).json({
        error: "Erro ao fazer login",
      });
    }
  });

  // User management routes (superadmin only)
  app.get("/api/users", authenticateToken, authorizeRoles("superadmin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        error: "Erro ao buscar usuários",
      });
    }
  });

  app.post("/api/users", authenticateToken, authorizeRoles("superadmin"), async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const creatorId = req.user?.userId || req.body.createdBy; // ID do super admin que está criando (do JWT)

      const newUser = await storage.createUser({
        username: userData.username,
        displayName: userData.displayName,
        password: userData.password,
        roles: userData.roles, // Array será convertido para JSON no storage
        createdBy: creatorId,
      });

      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error creating user:", error);
      res.status(500).json({
        error: "Erro ao criar usuário",
      });
    }
  });

  app.patch("/api/users/:id/roles", authenticateToken, authorizeRoles("superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { roles } = req.body;

      if (!roles || !Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({
          error: "Roles inválidos. Deve ser um array com pelo menos um papel.",
        });
      }

      await storage.updateUserRoles(id, roles);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(500).json({
        error: "Erro ao atualizar papéis do usuário",
      });
    }
  });

  // Delete user (superadmin only)
  app.delete("/api/users/:id", authenticateToken, authorizeRoles("superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`Deleting user: ${id}`);
      await storage.deleteUser(id);
      
      res.json({ success: true, message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        error: "Erro ao deletar usuário",
      });
    }
  });

  // Bale routes

  // Get bale statistics (requires authentication)
  app.get("/api/bales/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getBaleStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        error: "Erro ao buscar estatísticas",
      });
    }
  });

  // Get bale stats by talhao
  app.get("/api/bales/stats-by-talhao", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getBaleStatsByTalhao();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats by talhao:", error);
      res.status(500).json({
        error: "Erro ao buscar estatísticas por talhão",
      });
    }
  });

  // Get bale stats by safra
  app.get("/api/bales/stats-by-safra", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getStatsBySafra();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats by safra:", error);
      res.status(500).json({
        error: "Erro ao buscar estatísticas por safra",
      });
    }
  });

  // Get all bales
  app.get("/api/bales", authenticateToken, async (req, res) => {
    try {
      const bales = await storage.getAllBales();
      res.json(bales);
    } catch (error) {
      console.error("Error fetching bales:", error);
      res.status(500).json({
        error: "Erro ao buscar fardos",
      });
    }
  });

  // Get bale by ID
  app.get("/api/bales/:id", authenticateToken, async (req, res) => {
    try {
      const bale = await storage.getBale(req.params.id);

      if (!bale) {
        return res.status(404).json({
          error: "Fardo não encontrado",
        });
      }

      res.json(bale);
    } catch (error) {
      console.error("Error fetching bale:", error);
      res.status(500).json({
        error: "Erro ao buscar fardo",
      });
    }
  });

  // Create single bale (requires campo, admin or superadmin role)
  app.post("/api/bales", authenticateToken, authorizeRoles("campo", "admin", "superadmin"), async (req, res) => {
    try {
      const { id, safra, talhao, numero } = req.body;

      if (!id || !safra || !talhao || !numero) {
        return res.status(400).json({
          error: "Dados inválidos: id, safra, talhao e numero são obrigatórios",
        });
      }

      // Check if bale already exists
      const existing = await storage.getBale(id);
      if (existing) {
        return res.status(409).json({
          error: `Fardo ${id} já existe no sistema`,
        });
      }

      // Use userId from JWT token
      const userId = req.user?.userId || "unknown-user";
      const bale = await storage.createSingleBale(id, safra, talhao, numero, userId);

      // Notify all clients about the new bale
      notifyBaleChange();

      res.status(201).json(bale);
    } catch (error) {
      console.error("Error creating bale:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao criar fardo",
      });
    }
  });

  // Create bales in batch (requires campo, admin or superadmin role)
  app.post("/api/bales/batch", authenticateToken, authorizeRoles("campo", "admin", "superadmin"), async (req, res) => {
    try {
      const validatedData = batchCreateBalesSchema.parse(req.body);

      // Use userId from JWT token
      const userId = req.user?.userId || "unknown-user";

      const bales = await storage.batchCreateBales(validatedData, userId);

      // Notify all clients about the new bales
      notifyBaleChange();

      // Retornar informações sobre quantos foram criados vs quantos foram solicitados
      const response = {
        created: bales.length,
        requested: validatedData.quantidade,
        skipped: validatedData.quantidade - bales.length,
        bales: bales,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error creating bales:", error);
      res.status(500).json({
        error: "Erro ao cadastrar fardos",
      });
    }
  });

  // Update bale status (requires transporte for patio, algodoeira for beneficiado)
  app.patch("/api/bales/:id/status", authenticateToken, async (req, res) => {
    try {
      const { status } = updateBaleStatusSchema.parse(req.body);

      // Check role authorization based on status
      const userRoles = req.user?.roles || [];

      if (status === "patio" && !userRoles.includes("transporte") && !userRoles.includes("admin") && !userRoles.includes("superadmin")) {
        return res.status(403).json({
          error: "Apenas usuários com papel 'transporte', 'admin' ou 'superadmin' podem mover fardos para o pátio",
        });
      }

      if (status === "beneficiado" && !userRoles.includes("algodoeira") && !userRoles.includes("admin") && !userRoles.includes("superadmin")) {
        return res.status(403).json({
          error: "Apenas usuários com papel 'algodoeira', 'admin' ou 'superadmin' podem beneficiar fardos",
        });
      }

      // Use userId from JWT token
      const userId = req.user?.userId || "unknown-user";

      const bale = await storage.updateBaleStatus(
        req.params.id,
        status,
        userId
      );

      // Notify all clients about the status change
      notifyBaleChange();

      res.json(bale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        return res.status(400).json({
          error: error.message,
        });
      }

      console.error("Error updating bale status:", error);
      res.status(500).json({
        error: "Erro ao atualizar status do fardo",
      });
    }
  });

  // Delete all bales (superadmin only) - DEVE VIR ANTES DO DELETE BY ID
  app.delete("/api/bales/all", authenticateToken, authorizeRoles("superadmin"), async (req, res) => {
    try {
      console.log("=== DELETE /api/bales/all ===");
      console.log("Body:", req.body);
      
      // Aceita confirmação via body
      const confirm = req.body?.confirm;
      
      console.log("Confirm value:", confirm);
      
      if (confirm !== "DELETE_ALL_BALES") {
        console.log("❌ Invalid confirmation. Expected 'DELETE_ALL_BALES', got:", confirm);
        return res.status(400).json({
          error: `Confirmação inválida. Operação bloqueada. Recebido: ${confirm}`,
        });
      }

      console.log("✅ Confirmation valid. Deleting all bales...");
      const result = await storage.deleteAllBales();
      
      console.log(`✅ Deleted ${result.deletedCount} bales`);
      
      res.json({
        message: `${result.deletedCount} fardo(s) deletado(s) com sucesso`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("❌ Error deleting all bales:", error);
      res.status(500).json({
        error: "Erro ao deletar todos os fardos",
      });
    }
  });

  // Delete single bale (admin or superadmin only)
  app.delete("/api/bales/:id", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting bale: ${id}`);
      
      await storage.deleteBale(decodeURIComponent(id));
      
      res.json({ success: true, message: "Fardo excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting bale:", error);
      res.status(500).json({
        error: "Erro ao excluir fardo individual",
      });
    }
  });

  // Settings endpoints
  app.get("/api/settings/default-safra", authenticateToken, async (req, res) => {
    try {
      const setting = await storage.getSetting("default_safra");

      if (!setting) {
        return res.json({ value: "" });
      }

      res.json({ value: setting.value });
    } catch (error) {
      console.error("Error fetching default safra:", error);
      res.status(500).json({
        error: "Erro ao buscar safra padrão",
      });
    }
  });

  app.put("/api/settings/default-safra", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const { value } = updateDefaultSafraSchema.parse(req.body);

      const setting = await storage.updateSetting("default_safra", value);

      res.json({ value: setting.value });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      console.error("Error updating default safra:", error);
      res.status(500).json({
        error: "Erro ao atualizar safra padrão",
      });
    }
  });

  // Reports endpoints (requires authentication)
  app.get("/api/reports/pdf", authenticateToken, async (req, res) => {
    try {
      const bales = await storage.getAllBales();
      
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        talhao: req.query.talhao ? (req.query.talhao as string).split(',') : undefined,
      };
      
      const pdfBuffer = generatePDF(bales, filters);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=relatorio-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({
        error: "Erro ao gerar relatório PDF",
      });
    }
  });

  app.get("/api/reports/excel", authenticateToken, async (req, res) => {
    try {
      const bales = await storage.getAllBales();
      
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        talhao: req.query.talhao ? (req.query.talhao as string).split(',') : undefined,
      };
      
      const excelBuffer = generateExcel(bales, filters);
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=relatorio-${Date.now()}.xlsx`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({
        error: "Erro ao gerar relatório Excel",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}