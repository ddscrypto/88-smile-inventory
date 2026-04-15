import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStaffSchema, insertImplantSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- GTIN Lookup (GUDID proxy to avoid CORS) ---
  // Local GTIN-to-REF fallback for products not in GUDID (e.g., Helix Short MUAs)
  const LOCAL_GTIN_MAP: Record<string, { catalogNumber: string; brandName: string; deviceDescription: string }> = {
    // HS MUA straight 0°
    "07899878057528": { catalogNumber: "115.291", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 0.2mm" },
    "07899878057535": { catalogNumber: "115.292", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 1.5mm" },
    "07899878057542": { catalogNumber: "115.293", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 2.5mm" },
    "07899878057559": { catalogNumber: "115.294", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 3.5mm" },
    "07899878057566": { catalogNumber: "115.295", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 4.5mm" },
    // HS MUA angled 17°
    "07899878057573": { catalogNumber: "115.296", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 17D 0.6mm" },
    "07899878057580": { catalogNumber: "115.298", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 17D 2.5mm" },
    "07899878057597": { catalogNumber: "115.297", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 17D 1.5mm" },
    "07899878057603": { catalogNumber: "115.299", brandName: "Neodent", deviceDescription: "HS MINI CONICAL ABUTMENT 17D 3.5mm" },
  };

  app.get("/api/lookup-gtin/:gtin", async (req, res) => {
    const gtin = req.params.gtin;
    try {
      const response = await fetch(`https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?di=${gtin}`);
      if (response.ok) {
        const data = await response.json();
        const device = (data as any)?.gudid?.device;
        if (device?.catalogNumber) {
          return res.json({
            catalogNumber: device.catalogNumber || "",
            brandName: device.brandName || "",
            deviceDescription: device.deviceDescription || "",
            versionModelNumber: device.versionModelNumber || "",
          });
        }
      }
    } catch {
      // GUDID failed — fall through to local map
    }

    // Fallback: check local GTIN map (for products not in GUDID)
    const local = LOCAL_GTIN_MAP[gtin];
    if (local) {
      return res.json(local);
    }

    res.status(404).json({ error: "GTIN not found" });
  });

  // --- Catalog ---
  app.get("/api/catalog", (req, res) => {
    const q = req.query.q as string | undefined;
    const line = req.query.line as string | undefined;
    if (q && q.trim()) {
      res.json(storage.searchCatalog(q.trim()));
    } else if (line) {
      res.json(storage.getCatalogByLine(line));
    } else {
      res.json(storage.getCatalog());
    }
  });

  // --- Staff ---
  app.get("/api/staff", (_req, res) => {
    const staff = storage.getStaff();
    res.json(staff);
  });

  app.post("/api/staff", (req, res) => {
    const parsed = insertStaffSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const staff = storage.createStaff(parsed.data);
    res.json(staff);
  });

  app.patch("/api/staff/:id", (req, res) => {
    const id = Number(req.params.id);
    const { name, role } = req.body;
    const existing = storage.getStaffById(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = storage.updateStaff(id, { name, role });
    res.json(updated);
  });

  app.delete("/api/staff/:id", (req, res) => {
    storage.deleteStaff(Number(req.params.id));
    res.json({ ok: true });
  });

  // --- Staff PIN ---
  app.post("/api/staff/:id/set-pin", (req, res) => {
    const id = Number(req.params.id);
    const { pin } = req.body;
    if (!pin || typeof pin !== "string" || pin.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    const ok = storage.setStaffPin(id, pin);
    if (!ok) return res.status(404).json({ error: "Staff not found" });
    res.json({ ok: true });
  });

  app.post("/api/staff/:id/verify-pin", (req, res) => {
    const id = Number(req.params.id);
    const { pin } = req.body;
    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ error: "Password required" });
    }
    const valid = storage.verifyStaffPin(id, pin);
    res.json({ valid });
  });

  app.post("/api/staff/:id/reset-pin", (req, res) => {
    const id = Number(req.params.id);
    const ok = storage.resetStaffPin(id);
    if (!ok) return res.status(404).json({ error: "Staff not found" });
    res.json({ ok: true });
  });

  // --- Implants ---
  app.get("/api/implants", (req, res) => {
    const q = req.query.q as string | undefined;
    if (q && q.trim()) {
      res.json(storage.searchImplants(q.trim()));
    } else {
      res.json(storage.getImplants());
    }
  });

  app.get("/api/implants/:id", (req, res) => {
    const implant = storage.getImplantById(Number(req.params.id));
    if (!implant) return res.status(404).json({ error: "Not found" });
    res.json(implant);
  });

  app.get("/api/implants/qr/:qrData", (req, res) => {
    const implant = storage.getImplantByQr(decodeURIComponent(req.params.qrData));
    if (!implant) return res.status(404).json({ error: "Not found" });
    res.json(implant);
  });

  app.get("/api/implants/lot/:lotNumber", (req, res) => {
    const implant = storage.getImplantByLot(decodeURIComponent(req.params.lotNumber));
    if (!implant) return res.status(404).json({ error: "Not found" });
    res.json(implant);
  });

  app.post("/api/implants", (req, res) => {
    const parsed = insertImplantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const implant = storage.createImplant(parsed.data);
    // Log the add activity
    storage.createActivity({
      implantId: implant.id,
      action: "added",
      staffName: parsed.data.addedBy || "System",
      timestamp: new Date().toISOString(),
      notes: "Item added to inventory",
    });
    res.json(implant);
  });

  app.patch("/api/implants/:id", (req, res) => {
    const id = Number(req.params.id);
    const implant = storage.updateImplant(id, req.body);
    if (!implant) return res.status(404).json({ error: "Not found" });
    res.json(implant);
  });

  app.delete("/api/implants/:id", (req, res) => {
    const id = Number(req.params.id);
    const existing = storage.getImplantById(id);
    if (existing) {
      storage.createActivity({
        implantId: id,
        action: "deleted",
        staffName: req.body?.staffName || "System",
        timestamp: new Date().toISOString(),
        notes: `Removed: ${existing.brand} ${existing.productName}`,
      });
    }
    storage.deleteImplant(id);
    res.json({ ok: true });
  });

  // --- Check In / Out ---
  app.post("/api/implants/:id/checkout", (req, res) => {
    const id = Number(req.params.id);
    const { staffName, notes } = req.body;
    const implant = storage.updateImplant(id, { status: "out", lastActionAt: new Date().toISOString() });
    if (!implant) return res.status(404).json({ error: "Not found" });
    storage.createActivity({
      implantId: id,
      action: "checked_out",
      staffName: staffName || "Unknown",
      timestamp: new Date().toISOString(),
      notes: notes || "",
    });
    res.json(implant);
  });

  app.post("/api/implants/:id/checkin", (req, res) => {
    const id = Number(req.params.id);
    const { staffName, notes } = req.body;
    const implant = storage.updateImplant(id, { status: "in", lastActionAt: new Date().toISOString() });
    if (!implant) return res.status(404).json({ error: "Not found" });
    storage.createActivity({
      implantId: id,
      action: "checked_in",
      staffName: staffName || "Unknown",
      timestamp: new Date().toISOString(),
      notes: notes || "",
    });
    res.json(implant);
  });

  app.post("/api/implants/:id/trash", (req, res) => {
    const id = Number(req.params.id);
    const { staffName, notes } = req.body;
    const implant = storage.updateImplant(id, { status: "trashed", lastActionAt: new Date().toISOString() });
    if (!implant) return res.status(404).json({ error: "Not found" });
    storage.createActivity({
      implantId: id,
      action: "trashed",
      staffName: staffName || "Unknown",
      timestamp: new Date().toISOString(),
      notes: notes || "Discarded during surgery",
    });
    res.json(implant);
  });

  // --- Activity Log ---
  app.get("/api/activities", (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json(storage.getActivities(limit));
  });

  app.get("/api/activities/implant/:implantId", (req, res) => {
    res.json(storage.getActivitiesByImplant(Number(req.params.implantId)));
  });

  // --- Face ID / WebAuthn ---
  // Get challenge for registration or authentication
  app.get("/api/webauthn/challenge", (_req, res) => {
    const challenge = Buffer.from(crypto.randomUUID().replace(/-/g, ""), "hex");
    res.json({ challenge: challenge.toString("base64url") });
  });

  // Save credential ID after registration
  app.post("/api/staff/:id/webauthn/register", (req, res) => {
    const id = Number(req.params.id);
    const { credentialId } = req.body;
    if (!credentialId) return res.status(400).json({ error: "credentialId required" });
    storage.setStaffWebAuthnCredential(id, credentialId);
    res.json({ ok: true });
  });

  // Get credential ID for authentication
  app.get("/api/staff/:id/webauthn/credential", (req, res) => {
    const id = Number(req.params.id);
    const credentialId = storage.getStaffWebAuthnCredential(id);
    res.json({ credentialId });
  });

  // --- Dashboard stats ---
  app.get("/api/stats", (_req, res) => {
    const all = storage.getImplants();
    const totalItems = all.length;
    const inStock = all.filter(i => i.status === "in").length;
    const checkedOut = all.filter(i => i.status === "out").length;
    const expiringSoon = all.filter(i => {
      if (!i.expirationDate) return false;
      const exp = new Date(i.expirationDate);
      const now = new Date();
      const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 0 && diffDays <= 90;
    }).length;
    const expired = all.filter(i => {
      if (!i.expirationDate) return false;
      return new Date(i.expirationDate) < new Date();
    }).length;

    // Brand breakdown
    const brands: Record<string, number> = {};
    all.forEach(i => {
      const b = i.brand || "Unspecified";
      brands[b] = (brands[b] || 0) + 1;
    });

    const trashed = all.filter(i => i.status === "trashed").length;
    const trashedCost = all
      .filter(i => i.status === "trashed")
      .reduce((sum, i) => sum + (parseFloat(i.cost || "0") || 0), 0);

    res.json({ totalItems, inStock, checkedOut, expiringSoon, expired, brands, trashed, trashedCost });
  });

  // --- Analytics: Staff Summary ---
  app.get("/api/analytics/staff-summary", (_req, res) => {
    res.json(storage.getStaffActivitySummary());
  });

  // --- Analytics: Staff Detail ---
  app.get("/api/analytics/staff/:name", (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const limit = Number(req.query.limit) || 100;
    const activities = storage.getStaffActivities(name, limit);
    res.json(activities);
  });

  // --- Analytics: Most Used Sizes ---
  app.get("/api/analytics/most-used", (req, res) => {
    const limit = Number(req.query.limit) || 5;
    res.json(storage.getMostUsedSizes(limit));
  });

  // --- Analytics: Low Stock Alert ---
  app.get("/api/analytics/low-stock", (_req, res) => {
    const thresholdStr = storage.getSetting("low_stock_threshold");
    const threshold = thresholdStr ? parseInt(thresholdStr, 10) : 2;
    res.json(storage.getLowStockItems(threshold));
  });

  // --- Settings ---
  app.get("/api/settings/:key", (req, res) => {
    const value = storage.getSetting(req.params.key);
    res.json({ key: req.params.key, value: value ?? null });
  });

  app.put("/api/settings/:key", (req, res) => {
    const { value } = req.body;
    if (value === undefined || value === null) return res.status(400).json({ error: "value required" });
    storage.setSetting(req.params.key, String(value));
    res.json({ key: req.params.key, value: String(value) });
  });

  return httpServer;
}
