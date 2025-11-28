import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  loginSchema,
  createUserSchema,
  batchCreateBalesSchema,
  updateBaleStatusSchema,
  updateDefaultSafraSchema,
  createNotificationSchema,
  upsertProducaoTalhaoSchema,
  createCarregamentoSchema,
  upsertRendimentoTalhaoSchema,
  createLoteSchema,
  updateLoteSchema,
  createFardinhoSchema,
  updateFardinhoSchema,
  createSafraSchema,
  updateSafraSchema,
  batchCreateTalhoesSafraSchema,
} from "@shared/schema";
import { parseShapefileFromBuffers, parseGeoJSON } from "./shapefile-parser";
import multer from "multer";
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

// Configurar multer para upload de arquivos em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (sem autenticação)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

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

  // Get talhao counters (for offline sync)
  app.get("/api/talhao-counters", authenticateToken, async (req, res) => {
    try {
      const counters = await storage.getAllTalhaoCounters();
      res.json(counters);
    } catch (error) {
      console.error("Error fetching talhao counters:", error);
      res.status(500).json({
        error: "Erro ao buscar contadores",
      });
    }
  });

  // Get talhoes info (hectares, etc)
  app.get("/api/talhoes-info", authenticateToken, async (req, res) => {
    try {
      const talhoes = await storage.getAllTalhoesInfo();
      res.json(talhoes);
    } catch (error) {
      console.error("Error fetching talhoes info:", error);
      res.status(500).json({
        error: "Erro ao buscar informações dos talhões",
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

  // Notifications endpoints
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const notifications = await storage.getActiveNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        error: "Erro ao buscar notificações",
      });
    }
  });

  app.post("/api/notifications", authenticateToken, authorizeRoles("superadmin"), async (req, res) => {
    try {
      const data = createNotificationSchema.parse(req.body);
      const notification = await storage.createNotification({
        ...data,
        createdBy: req.user!.userId,
      });

      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      console.error("Error creating notification:", error);
      res.status(500).json({
        error: "Erro ao criar notificação",
      });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, authorizeRoles("superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNotification(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({
        error: "Erro ao deletar notificação",
      });
    }
  });

  // Reports endpoints (requires authentication)
  app.get("/api/reports/pdf", authenticateToken, async (req, res) => {
    try {
      const safra = req.query.safra as string || "24/25";
      const reportType = req.query.reportType as string || "custom";

      // Fetch all necessary data including talhoes info from database
      const [bales, carregamentos, lotes, fardinhos, pesoBrutoTotais, talhoesInfo] = await Promise.all([
        storage.getAllBales(),
        storage.getAllCarregamentosBySafra(safra),
        storage.getAllLotesBySafra(safra),
        storage.getAllFardinhosBySafra(safra),
        storage.getPesoBrutoByTalhao(safra),
        storage.getAllTalhoesInfo(),
      ]);

      const filters = {
        safra,
        reportType: reportType as any,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        talhao: req.query.talhao ? (req.query.talhao as string).split(',') : undefined,
        columns: req.query.columns ? (req.query.columns as string).split(',') : undefined,
      };

      const additionalData = {
        carregamentos,
        lotes,
        fardinhos,
        pesoBrutoTotais,
        talhoesInfo,
      };

      const pdfBuffer = await generatePDF(bales, filters, additionalData);

      const reportNames: Record<string, string> = {
        'safra-summary': 'resumo-safra',
        'productivity': 'produtividade',
        'shipments': 'carregamentos',
        'processing': 'beneficiamento',
        'inventory': 'inventario',
        'custom': 'personalizado',
      };
      const reportName = reportNames[reportType] || 'relatorio';

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${reportName}-${safra.replace('/', '-')}-${Date.now()}.pdf`);
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
      const safra = req.query.safra as string || "24/25";
      const reportType = req.query.reportType as string || "custom";

      // Fetch all necessary data including talhoes info from database
      const [bales, carregamentos, lotes, fardinhos, pesoBrutoTotais, talhoesInfo] = await Promise.all([
        storage.getAllBales(),
        storage.getAllCarregamentosBySafra(safra),
        storage.getAllLotesBySafra(safra),
        storage.getAllFardinhosBySafra(safra),
        storage.getPesoBrutoByTalhao(safra),
        storage.getAllTalhoesInfo(),
      ]);

      const filters = {
        safra,
        reportType: reportType as any,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        talhao: req.query.talhao ? (req.query.talhao as string).split(',') : undefined,
        columns: req.query.columns ? (req.query.columns as string).split(',') : undefined,
      };

      const additionalData = {
        carregamentos,
        lotes,
        fardinhos,
        pesoBrutoTotais,
        talhoesInfo,
      };

      const excelBuffer = generateExcel(bales, filters, additionalData);

      const reportNames: Record<string, string> = {
        'safra-summary': 'resumo-safra',
        'productivity': 'produtividade',
        'shipments': 'carregamentos',
        'processing': 'beneficiamento',
        'inventory': 'inventario',
        'custom': 'personalizado',
      };
      const reportName = reportNames[reportType] || 'relatorio';

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${reportName}-${safra.replace('/', '-')}-${Date.now()}.xlsx`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({
        error: "Erro ao gerar relatório Excel",
      });
    }
  });

  // Produção por talhão endpoints (dados reais da algodoeira)
  app.get("/api/producao/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const producao = await storage.getAllProducaoBySafra(safra);
      res.json(producao);
    } catch (error) {
      console.error("Error fetching producao:", error);
      res.status(500).json({
        error: "Erro ao buscar dados de produção",
      });
    }
  });

  app.get("/api/producao/:safra/:talhao", authenticateToken, async (req, res) => {
    try {
      const { safra, talhao } = req.params;
      const producao = await storage.getProducaoByTalhao(safra, talhao);

      if (!producao) {
        return res.json(null);
      }

      res.json(producao);
    } catch (error) {
      console.error("Error fetching producao by talhao:", error);
      res.status(500).json({
        error: "Erro ao buscar dados de produção do talhão",
      });
    }
  });

  app.put("/api/producao", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const data = upsertProducaoTalhaoSchema.parse(req.body);
      const userId = req.user?.userId || "unknown-user";

      const producao = await storage.upsertProducaoTalhao(data, userId);

      res.json(producao);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error saving producao:", error);
      res.status(500).json({
        error: "Erro ao salvar dados de produção",
      });
    }
  });

  // ========== CARREGAMENTOS ENDPOINTS ==========

  // Get all carregamentos by safra
  app.get("/api/carregamentos/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const carregamentos = await storage.getAllCarregamentosBySafra(safra);
      res.json(carregamentos);
    } catch (error) {
      console.error("Error fetching carregamentos:", error);
      res.status(500).json({ error: "Erro ao buscar carregamentos" });
    }
  });

  // Get carregamentos by talhao
  app.get("/api/carregamentos/:safra/:talhao", authenticateToken, async (req, res) => {
    try {
      const { safra, talhao } = req.params;
      const carregamentos = await storage.getCarregamentosByTalhao(safra, talhao);
      res.json(carregamentos);
    } catch (error) {
      console.error("Error fetching carregamentos by talhao:", error);
      res.status(500).json({ error: "Erro ao buscar carregamentos do talhão" });
    }
  });

  // Get peso bruto total by talhao (aggregated)
  app.get("/api/carregamentos-totais/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const totais = await storage.getPesoBrutoByTalhao(safra);
      res.json(totais);
    } catch (error) {
      console.error("Error fetching peso bruto totals:", error);
      res.status(500).json({ error: "Erro ao buscar totais de peso bruto" });
    }
  });

  // Create carregamento
  app.post("/api/carregamentos", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const data = createCarregamentoSchema.parse(req.body);
      const userId = req.user?.userId || "unknown-user";
      const carregamento = await storage.createCarregamento(data, userId);
      res.status(201).json(carregamento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error creating carregamento:", error);
      res.status(500).json({ error: "Erro ao criar carregamento" });
    }
  });

  // Delete carregamento
  app.delete("/api/carregamentos/:id", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCarregamento(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting carregamento:", error);
      res.status(500).json({ error: "Erro ao deletar carregamento" });
    }
  });

  // ========== RENDIMENTO ENDPOINTS ==========

  // Get all rendimento by safra
  app.get("/api/rendimento/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const rendimentos = await storage.getAllRendimentoBySafra(safra);
      res.json(rendimentos);
    } catch (error) {
      console.error("Error fetching rendimento:", error);
      res.status(500).json({ error: "Erro ao buscar rendimentos" });
    }
  });

  // Get rendimento by talhao
  app.get("/api/rendimento/:safra/:talhao", authenticateToken, async (req, res) => {
    try {
      const { safra, talhao } = req.params;
      const rendimento = await storage.getRendimentoByTalhao(safra, talhao);
      res.json(rendimento || null);
    } catch (error) {
      console.error("Error fetching rendimento by talhao:", error);
      res.status(500).json({ error: "Erro ao buscar rendimento do talhão" });
    }
  });

  // Upsert rendimento
  app.put("/api/rendimento", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const data = upsertRendimentoTalhaoSchema.parse(req.body);
      const userId = req.user?.userId || "unknown-user";
      const rendimento = await storage.upsertRendimentoTalhao(data, userId);
      res.json(rendimento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error saving rendimento:", error);
      res.status(500).json({ error: "Erro ao salvar rendimento" });
    }
  });

  // ========== LOTES ENDPOINTS (BENEFICIAMENTO) ==========

  // Get all lotes by safra
  app.get("/api/lotes/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const lotes = await storage.getAllLotesBySafra(safra);
      res.json(lotes);
    } catch (error) {
      console.error("Error fetching lotes:", error);
      res.status(500).json({ error: "Erro ao buscar lotes" });
    }
  });

  // Get total peso bruto da safra (soma de todos os carregamentos)
  app.get("/api/lotes-peso-bruto/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const pesoBrutoTotal = await storage.getTotalPesoBrutoSafra(safra);
      res.json({ pesoBrutoTotal });
    } catch (error) {
      console.error("Error fetching peso bruto total:", error);
      res.status(500).json({ error: "Erro ao buscar peso bruto total" });
    }
  });

  // Get lote by ID
  app.get("/api/lote/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const lote = await storage.getLoteById(id);
      if (!lote) {
        return res.status(404).json({ error: "Lote não encontrado" });
      }
      res.json(lote);
    } catch (error) {
      console.error("Error fetching lote:", error);
      res.status(500).json({ error: "Erro ao buscar lote" });
    }
  });

  // Create lote
  app.post("/api/lotes", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const data = createLoteSchema.parse(req.body);
      const userId = req.user?.userId || "unknown-user";
      const lote = await storage.createLote(data, userId);
      res.status(201).json(lote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error creating lote:", error);
      res.status(500).json({ error: "Erro ao criar lote" });
    }
  });

  // Update lote
  app.patch("/api/lotes/:id", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateLoteSchema.parse(req.body);
      const userId = req.user?.userId || "unknown-user";
      const lote = await storage.updateLote(id, data, userId);
      res.json(lote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error updating lote:", error);
      res.status(500).json({ error: "Erro ao atualizar lote" });
    }
  });

  // Delete lote
  app.delete("/api/lotes/:id", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLote(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lote:", error);
      res.status(500).json({ error: "Erro ao deletar lote" });
    }
  });

  // ========== FARDINHOS ENDPOINTS (SEPARADO DOS LOTES) ==========

  // Get all fardinhos by safra
  app.get("/api/fardinhos/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const fardinhos = await storage.getAllFardinhosBySafra(safra);
      res.json(fardinhos);
    } catch (error) {
      console.error("Error fetching fardinhos:", error);
      res.status(500).json({ error: "Erro ao buscar fardinhos" });
    }
  });

  // Get total fardinhos da safra
  app.get("/api/fardinhos-total/:safra", authenticateToken, async (req, res) => {
    try {
      const { safra } = req.params;
      const totalFardinhos = await storage.getTotalFardinhosSafra(safra);
      res.json({ totalFardinhos });
    } catch (error) {
      console.error("Error fetching total fardinhos:", error);
      res.status(500).json({ error: "Erro ao buscar total de fardinhos" });
    }
  });

  // Create fardinho
  app.post("/api/fardinhos", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const data = createFardinhoSchema.parse(req.body);
      const userId = req.user?.userId || "unknown-user";
      const fardinho = await storage.createFardinho(data, userId);
      res.status(201).json(fardinho);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error creating fardinho:", error);
      res.status(500).json({ error: "Erro ao criar fardinho" });
    }
  });

  // Update fardinho
  app.patch("/api/fardinhos/:id", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateFardinhoSchema.parse(req.body);
      const fardinho = await storage.updateFardinho(id, data);
      res.json(fardinho);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error updating fardinho:", error);
      res.status(500).json({ error: "Erro ao atualizar fardinho" });
    }
  });

  // Delete fardinho
  app.delete("/api/fardinhos/:id", authenticateToken, authorizeRoles("algodoeira", "admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFardinho(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting fardinho:", error);
      res.status(500).json({ error: "Erro ao deletar fardinho" });
    }
  });

  // ========== SAFRAS ENDPOINTS ==========

  // Get all safras
  app.get("/api/safras", authenticateToken, async (req, res) => {
    try {
      const safras = await storage.getAllSafras();
      res.json(safras);
    } catch (error) {
      console.error("Error fetching safras:", error);
      res.status(500).json({ error: "Erro ao buscar safras" });
    }
  });

  // Get active safra
  app.get("/api/safras/ativa", authenticateToken, async (req, res) => {
    try {
      const safra = await storage.getSafraAtiva();
      res.json(safra || null);
    } catch (error) {
      console.error("Error fetching active safra:", error);
      res.status(500).json({ error: "Erro ao buscar safra ativa" });
    }
  });

  // Get safra by ID
  app.get("/api/safras/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const safra = await storage.getSafraById(id);
      if (!safra) {
        return res.status(404).json({ error: "Safra não encontrada" });
      }
      res.json(safra);
    } catch (error) {
      console.error("Error fetching safra:", error);
      res.status(500).json({ error: "Erro ao buscar safra" });
    }
  });

  // Create safra
  app.post("/api/safras", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const data = createSafraSchema.parse(req.body);
      const userId = req.user?.userId || "unknown-user";
      const safra = await storage.createSafra(data, userId);
      res.status(201).json(safra);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error creating safra:", error);
      res.status(500).json({ error: "Erro ao criar safra" });
    }
  });

  // Update safra
  app.patch("/api/safras/:id", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const data = updateSafraSchema.parse(req.body);
      const safra = await storage.updateSafra(id, data);
      res.json(safra);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error updating safra:", error);
      res.status(500).json({ error: "Erro ao atualizar safra" });
    }
  });

  // Set active safra
  app.post("/api/safras/:id/ativar", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      const safra = await storage.setActiveSafra(id);

      // Também atualizar o setting antigo para compatibilidade
      await storage.updateSetting("default_safra", safra.nome);

      res.json(safra);
    } catch (error) {
      console.error("Error activating safra:", error);
      res.status(500).json({ error: "Erro ao ativar safra" });
    }
  });

  // Delete safra
  app.delete("/api/safras/:id", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSafra(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting safra:", error);
      res.status(500).json({ error: "Erro ao deletar safra" });
    }
  });

  // ========== TALHÕES SAFRA ENDPOINTS ==========

  // Get talhões by safra ID
  app.get("/api/safras/:safraId/talhoes", authenticateToken, async (req, res) => {
    try {
      const { safraId } = req.params;
      const talhoes = await storage.getTalhoesBySafra(safraId);
      res.json(talhoes);
    } catch (error) {
      console.error("Error fetching talhoes:", error);
      res.status(500).json({ error: "Erro ao buscar talhões" });
    }
  });

  // Get talhões by safra nome (para compatibilidade com sistema antigo)
  app.get("/api/talhoes-safra/:safraNome", authenticateToken, async (req, res) => {
    try {
      const { safraNome } = req.params;
      const talhoes = await storage.getTalhoesBySafraNome(decodeURIComponent(safraNome));
      res.json(talhoes);
    } catch (error) {
      console.error("Error fetching talhoes by safra nome:", error);
      res.status(500).json({ error: "Erro ao buscar talhões da safra" });
    }
  });

  // Batch create talhões (após seleção do usuário)
  app.post("/api/safras/:safraId/talhoes/batch", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const { safraId } = req.params;
      const data = batchCreateTalhoesSafraSchema.parse({
        safraId,
        talhoes: req.body.talhoes,
      });
      const userId = req.user?.userId || "unknown-user";

      // Deletar talhões existentes antes de criar novos
      await storage.deleteTalhoesBySafra(safraId);

      const talhoes = await storage.batchCreateTalhoesSafra(data, userId);
      res.status(201).json(talhoes);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }
      console.error("Error batch creating talhoes:", error);
      res.status(500).json({ error: "Erro ao criar talhões" });
    }
  });

  // Delete all talhões from safra
  app.delete("/api/safras/:safraId/talhoes", authenticateToken, authorizeRoles("admin", "superadmin"), async (req, res) => {
    try {
      const { safraId } = req.params;
      await storage.deleteTalhoesBySafra(safraId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting talhoes:", error);
      res.status(500).json({ error: "Erro ao deletar talhões" });
    }
  });

  // ========== SHAPEFILE UPLOAD & PROCESSING ==========

  // Upload and process shapefile
  app.post(
    "/api/shapefile/parse",
    authenticateToken,
    authorizeRoles("admin", "superadmin"),
    upload.fields([
      { name: "shp", maxCount: 1 },
      { name: "dbf", maxCount: 1 },
      { name: "geojson", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Verificar se é GeoJSON
        if (files.geojson && files.geojson[0]) {
          const geojsonBuffer = files.geojson[0].buffer;
          const geojsonString = geojsonBuffer.toString("utf-8");

          try {
            const geojson = JSON.parse(geojsonString);
            const result = parseGeoJSON(geojson);

            if (!result.success) {
              return res.status(400).json({ error: result.error });
            }

            return res.json({
              success: true,
              talhoes: result.talhoes,
              totalFeatures: result.totalFeatures,
            });
          } catch (parseError) {
            return res.status(400).json({ error: "GeoJSON inválido" });
          }
        }

        // Verificar se é Shapefile
        if (!files.shp || !files.shp[0]) {
          return res.status(400).json({
            error: "Arquivo .shp é obrigatório. Envie os arquivos .shp e .dbf ou um arquivo GeoJSON.",
          });
        }

        const shpBuffer = files.shp[0].buffer;
        const dbfBuffer = files.dbf && files.dbf[0] ? files.dbf[0].buffer : undefined;

        const result = await parseShapefileFromBuffers(shpBuffer, dbfBuffer);

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.json({
          success: true,
          talhoes: result.talhoes,
          totalFeatures: result.totalFeatures,
        });
      } catch (error) {
        console.error("Error processing shapefile:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Erro ao processar arquivo",
        });
      }
    }
  );

  const httpServer = createServer(app);

  return httpServer;
}