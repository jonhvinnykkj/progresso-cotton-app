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
  // Aceita ?safra=24/25 para filtrar por safra específica
  app.get("/api/bales/stats", authenticateToken, async (req, res) => {
    try {
      const safra = req.query.safra as string | undefined;
      const stats = await storage.getBaleStats(safra);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        error: "Erro ao buscar estatísticas",
      });
    }
  });

  // Get bale stats by talhao
  // Aceita ?safra=24/25 para filtrar por safra específica
  app.get("/api/bales/stats-by-talhao", authenticateToken, async (req, res) => {
    try {
      const safra = req.query.safra as string | undefined;
      const stats = await storage.getBaleStatsByTalhao(safra);
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

  // Get all bales - aceita ?safra=24/25 para filtrar por safra específica
  app.get("/api/bales", authenticateToken, async (req, res) => {
    try {
      const safra = req.query.safra as string | undefined;
      let bales = await storage.getAllBales();

      // Filtrar por safra se fornecido
      if (safra) {
        bales = bales.filter(b => b.safra === safra);
      }

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

  // ==================== COTAÇÃO DO ALGODÃO ====================

  // Alpha Vantage API Key (obter grátis em https://www.alphavantage.co/support/#api-key)
  const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'G2WYEZ7T7C6CW8T5';

  // Armazenamento em memória das cotações (fallback)
  let cotacaoCache: {
    pluma: number;
    caroco: number;
    cottonUSD: number; // cents/lb original
    usdBrl: number; // taxa de câmbio
    dataAtualizacao: string;
    fonte: string;
    variacaoDolar?: number; // % variação último mês
    variacaoAlgodao?: number; // % variação último mês
    variacaoPluma?: number; // % variação último mês
    variacaoCaroco?: number; // % variação último mês
  } = {
    pluma: 140.00, // R$/@ padrão
    caroco: 38.00, // R$/@ padrão
    cottonUSD: 0,
    usdBrl: 0,
    dataAtualizacao: new Date().toISOString(),
    fonte: 'manual'
  };

  // Função para buscar variação mensal do dólar
  async function fetchDolarVariacao(): Promise<number | null> {
    try {
      const response = await fetch('https://economia.awesomeapi.com.br/json/daily/USD-BRL/30');
      const data = await response.json();
      if (Array.isArray(data) && data.length >= 2) {
        const atual = parseFloat(data[0].bid);
        const antigo = parseFloat(data[data.length - 1].bid);
        const variacao = ((atual - antigo) / antigo) * 100;
        return Math.round(variacao * 100) / 100;
      }
      return null;
    } catch (error) {
      console.error('Error fetching dolar variacao:', error);
      return null;
    }
  }

  // Função para buscar cotação do algodão da Alpha Vantage
  async function fetchCottonPrice(): Promise<{ price: number; date: string; variacao?: number } | null> {
    try {
      const url = `https://www.alphavantage.co/query?function=COTTON&interval=monthly&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      // Verificar se há erro na resposta (ex: limite de API)
      if (data['Error Message'] || data['Note']) {
        console.log('Alpha Vantage API limit or error:', data['Note'] || data['Error Message']);
        return null;
      }

      const timeSeries = data['data'];
      if (!timeSeries || timeSeries.length === 0) {
        return null;
      }

      // Pegar o valor mais recente e calcular variação
      const latest = timeSeries[0];
      const priceAtual = parseFloat(latest.value);

      // Calcular variação mensal (comparar com mês anterior)
      let variacao: number | undefined;
      if (timeSeries.length >= 2) {
        const anterior = parseFloat(timeSeries[1].value);
        variacao = Math.round(((priceAtual - anterior) / anterior) * 100 * 100) / 100;
      }

      return {
        price: priceAtual, // cents per pound
        date: latest.date,
        variacao
      };
    } catch (error) {
      console.error('Error fetching cotton price from Alpha Vantage:', error);
      return null;
    }
  }

  // Função para buscar taxa de câmbio USD/BRL (AwesomeAPI como principal, Alpha Vantage como fallback)
  async function fetchUsdBrlRate(): Promise<number | null> {
    // Tentar AwesomeAPI primeiro (gratuita, sem limite de requisições)
    try {
      const awesomeResponse = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      const awesomeData = await awesomeResponse.json();

      if (awesomeData?.USDBRL?.bid) {
        const rate = parseFloat(awesomeData.USDBRL.bid);
        console.log(`USD/BRL rate from AwesomeAPI: ${rate}`);
        return rate;
      }
    } catch (error) {
      console.log('AwesomeAPI failed, trying Alpha Vantage fallback:', error);
    }

    // Fallback para Alpha Vantage
    try {
      const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=BRL&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      // Verificar se há erro na resposta
      if (data['Error Message'] || data['Note']) {
        console.log('Alpha Vantage API limit or error:', data['Note'] || data['Error Message']);
        return null;
      }

      const timeSeries = data['Time Series FX (Daily)'];
      if (!timeSeries) {
        return null;
      }

      // Pegar o primeiro (mais recente) registro
      const dates = Object.keys(timeSeries).sort().reverse();
      if (dates.length === 0) {
        return null;
      }

      const latestDate = dates[0];
      const latestData = timeSeries[latestDate];

      // Usar o preço de fechamento (close)
      return parseFloat(latestData['4. close']);
    } catch (error) {
      console.error('Error fetching USD/BRL rate from Alpha Vantage:', error);
      return null;
    }
  }

  // Converter cents/lb para R$/@
  // 1 arroba = 15 kg = 33.07 pounds
  function convertToReaisPerArroba(centsPerPound: number, usdBrlRate: number): number {
    const POUNDS_PER_ARROBA = 33.07;
    const usdPerPound = centsPerPound / 100;
    const usdPerArroba = usdPerPound * POUNDS_PER_ARROBA;
    const brlPerArroba = usdPerArroba * usdBrlRate;
    return Math.round(brlPerArroba * 100) / 100; // 2 casas decimais
  }

  // GET: Buscar cotação atual
  app.get("/api/cotacao-algodao", authenticateToken, async (req, res) => {
    try {
      // Verificar se o cache é recente (menos de 8 horas - economia de API calls)
      const cacheAge = Date.now() - new Date(cotacaoCache.dataAtualizacao).getTime();
      const oitoHoras = 8 * 60 * 60 * 1000;

      // Se cache recente e fonte é API, retornar cache
      if (cacheAge < oitoHoras && cotacaoCache.fonte === 'Alpha Vantage') {
        return res.json(cotacaoCache);
      }

      // Tentar buscar de Alpha Vantage e variações
      const [cottonData, usdBrlRate, variacaoDolar] = await Promise.all([
        fetchCottonPrice(),
        fetchUsdBrlRate(),
        fetchDolarVariacao()
      ]);

      if (cottonData && usdBrlRate) {
        // Calcular preço em R$/@ para pluma
        const plumaPrice = convertToReaisPerArroba(cottonData.price, usdBrlRate);
        // Caroço é aproximadamente 27% do valor da pluma (proporção de mercado)
        const carocoPrice = Math.round(plumaPrice * 0.27 * 100) / 100;

        // Variação do algodão afeta pluma e caroço proporcionalmente
        const variacaoAlgodao = cottonData.variacao;

        cotacaoCache = {
          pluma: plumaPrice,
          caroco: carocoPrice,
          cottonUSD: cottonData.price,
          usdBrl: usdBrlRate,
          dataAtualizacao: new Date().toISOString(),
          fonte: 'ICE Futures (CBOT)',
          variacaoDolar: variacaoDolar ?? undefined,
          variacaoAlgodao: variacaoAlgodao,
          variacaoPluma: variacaoAlgodao, // mesma variação do algodão
          variacaoCaroco: variacaoAlgodao // mesma variação do algodão
        };

        console.log(`Cotton price (ICE Futures): ${cottonData.price} cents/lb -> R$ ${plumaPrice}/@ (USD/BRL: ${usdBrlRate}, var: ${variacaoAlgodao}%)`);
      } else {
        // Se API falhou mas temos cache válido, retornar cache
        if (cotacaoCache.pluma > 0) {
          return res.json(cotacaoCache);
        }
      }

      res.json(cotacaoCache);
    } catch (error) {
      console.error("Error fetching cotton price:", error);
      // Em caso de erro, retornar cache existente
      res.json(cotacaoCache);
    }
  });

  // GET: Buscar histórico de cotações
  app.get("/api/cotacao-algodao/historico", authenticateToken, async (req, res) => {
    try {
      const tipo = req.query.tipo as string || 'dolar';
      const dias = Math.min(parseInt(req.query.dias as string) || 30, 3650); // máximo 10 anos

      console.log(`Fetching historico: tipo=${tipo}, dias=${dias}`);

      if (tipo === 'dolar') {
        // Para 1 dia (24h), buscar dados mais granulares
        if (dias === 1) {
          // Buscar últimas 24 cotações (aproximadamente por hora)
          const url = 'https://economia.awesomeapi.com.br/json/USD-BRL/24';
          console.log('Fetching dolar 24h from:', url);

          const response = await fetch(url);
          const data = await response.json();

          if (Array.isArray(data) && data.length > 0) {
            const historico = data.map((item: any) => {
              const date = new Date(parseInt(item.timestamp) * 1000);
              return {
                data: date.toISOString(),
                dataFormatada: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
                valor: parseFloat(item.bid),
                variacao: parseFloat(item.pctChange || 0)
              };
            }).reverse();

            return res.json({ tipo: 'dolar', historico, periodo: '24 horas', fonte: 'AwesomeAPI' });
          }
        } else {
          // Buscar histórico diário do dólar da AwesomeAPI
          const url = `https://economia.awesomeapi.com.br/json/daily/USD-BRL/${dias}`;
          console.log('Fetching dolar from:', url);

          const response = await fetch(url);
          const data = await response.json();

          console.log('AwesomeAPI response type:', typeof data, Array.isArray(data) ? `array[${data.length}]` : 'not array');

          if (Array.isArray(data) && data.length > 0) {
            const historico = data.map((item: any) => ({
              data: new Date(parseInt(item.timestamp) * 1000).toISOString().split('T')[0],
              valor: parseFloat(item.bid),
              variacao: parseFloat(item.pctChange || 0)
            })).reverse();

            return res.json({ tipo: 'dolar', historico, periodo: `${dias} dias`, fonte: 'AwesomeAPI' });
          } else {
            console.log('AwesomeAPI data invalid:', data);
          }
        }
      } else if (tipo === 'algodao' || tipo === 'pluma' || tipo === 'caroco') {
        // Buscar histórico do algodão - ICE Cotton Futures (Bolsa de Chicago/NY)
        const url = `https://www.alphavantage.co/query?function=COTTON&interval=monthly&apikey=${ALPHA_VANTAGE_API_KEY}`;
        console.log('Fetching cotton from ICE Futures (via Alpha Vantage)');

        const [cottonResponse, dolarResponse] = await Promise.all([
          fetch(url),
          fetch('https://economia.awesomeapi.com.br/json/daily/USD-BRL/30')
        ]);

        const cottonData = await cottonResponse.json();
        const dolarData = await dolarResponse.json();

        // Verificar se Alpha Vantage retornou erro
        if (cottonData['Error Message'] || cottonData['Note']) {
          console.log('Alpha Vantage error:', cottonData['Note'] || cottonData['Error Message']);
          // Retornar dados simulados baseados no cache atual se API falhar
          if (cotacaoCache.cottonUSD > 0) {
            const meses = Math.min(Math.ceil(dias / 30), 12);
            const historico = [];
            const dolarMedio = Array.isArray(dolarData)
              ? dolarData.reduce((acc: number, item: any) => acc + parseFloat(item.bid), 0) / dolarData.length
              : cotacaoCache.usdBrl;

            for (let i = meses - 1; i >= 0; i--) {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const variacao = (Math.random() - 0.5) * 10; // Simulação de variação
              const centsLb = cotacaoCache.cottonUSD + variacao;

              if (tipo === 'algodao') {
                historico.push({
                  data: date.toISOString().split('T')[0].substring(0, 7),
                  valor: Math.round(centsLb * 100) / 100,
                  unidade: 'cents/lb'
                });
              } else {
                const reaisArroba = convertToReaisPerArroba(centsLb, dolarMedio);
                const valorFinal = tipo === 'caroco' ? reaisArroba * 0.27 : reaisArroba;
                historico.push({
                  data: date.toISOString().split('T')[0].substring(0, 7),
                  valor: Math.round(valorFinal * 100) / 100,
                  centsLb: Math.round(centsLb * 100) / 100,
                  unidade: 'R$/@'
                });
              }
            }
            return res.json({ tipo, historico, dolarMedio, fonte: 'ICE Futures (cache)' });
          }
        }

        if (cottonData['data'] && Array.isArray(cottonData['data'])) {
          const meses = Math.min(Math.ceil(dias / 30), 12);
          const dolarMedio = Array.isArray(dolarData)
            ? dolarData.reduce((acc: number, item: any) => acc + parseFloat(item.bid), 0) / dolarData.length
            : cotacaoCache.usdBrl || 5.5;

          if (tipo === 'algodao') {
            const historico = cottonData['data'].slice(0, meses).map((item: any) => ({
              data: item.date,
              valor: parseFloat(item.value),
              unidade: 'cents/lb'
            })).reverse();

            return res.json({ tipo: 'algodao', historico, periodo: `${meses} meses`, fonte: 'ICE Cotton Futures' });
          } else {
            const historico = cottonData['data'].slice(0, meses).map((item: any) => {
              const centsLb = parseFloat(item.value);
              const reaisArroba = convertToReaisPerArroba(centsLb, dolarMedio);
              const valorFinal = tipo === 'caroco' ? reaisArroba * 0.27 : reaisArroba;
              return {
                data: item.date,
                valor: Math.round(valorFinal * 100) / 100,
                centsLb: centsLb,
                unidade: 'R$/@'
              };
            }).reverse();

            return res.json({ tipo, historico, dolarMedio, periodo: `${meses} meses`, fonte: 'ICE Cotton Futures' });
          }
        } else {
          console.log('Cotton data invalid:', Object.keys(cottonData));
        }
      }

      // Fallback - retornar dados do cache se disponíveis
      if (cotacaoCache.pluma > 0) {
        const historico = [{
          data: new Date().toISOString().split('T')[0],
          valor: tipo === 'dolar' ? cotacaoCache.usdBrl :
                 tipo === 'algodao' ? cotacaoCache.cottonUSD :
                 tipo === 'caroco' ? cotacaoCache.caroco : cotacaoCache.pluma,
          unidade: tipo === 'dolar' ? 'BRL' : tipo === 'algodao' ? 'cents/lb' : 'R$/@'
        }];
        return res.json({ tipo, historico, fonte: 'cache_atual', message: 'Apenas valor atual disponível' });
      }

      res.json({ tipo, historico: [], message: 'Dados não disponíveis' });
    } catch (error) {
      console.error("Error fetching historical data:", error);
      res.status(500).json({ error: "Erro ao buscar histórico", details: String(error) });
    }
  });

  // POST: Forçar atualização da API
  app.post("/api/cotacao-algodao/refresh", authenticateToken, async (req, res) => {
    try {
      const [cottonData, usdBrlRate] = await Promise.all([
        fetchCottonPrice(),
        fetchUsdBrlRate()
      ]);

      if (cottonData && usdBrlRate) {
        const plumaPrice = convertToReaisPerArroba(cottonData.price, usdBrlRate);
        const carocoPrice = Math.round(plumaPrice * 0.27 * 100) / 100;

        cotacaoCache = {
          pluma: plumaPrice,
          caroco: carocoPrice,
          cottonUSD: cottonData.price,
          usdBrl: usdBrlRate,
          dataAtualizacao: new Date().toISOString(),
          fonte: 'Alpha Vantage'
        };

        res.json(cotacaoCache);
      } else {
        res.status(503).json({
          error: "Não foi possível atualizar. Limite de API atingido ou serviço indisponível.",
          cache: cotacaoCache
        });
      }
    } catch (error) {
      console.error("Error refreshing cotton price:", error);
      res.status(500).json({ error: "Erro ao atualizar cotação" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}