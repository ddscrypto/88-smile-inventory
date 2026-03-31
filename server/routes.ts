import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStaffSchema, insertImplantSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  app.delete("/api/staff/:id", (req, res) => {
    storage.deleteStaff(Number(req.params.id));
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
    const implant = storage.updateImplant(id, { status: "out" });
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
    const implant = storage.updateImplant(id, { status: "in" });
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

  // --- Activity Log ---
  app.get("/api/activities", (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json(storage.getActivities(limit));
  });

  app.get("/api/activities/implant/:implantId", (req, res) => {
    res.json(storage.getActivitiesByImplant(Number(req.params.implantId)));
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

    res.json({ totalItems, inStock, checkedOut, expiringSoon, expired, brands });
  });

  return httpServer;
}
