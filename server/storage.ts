import {
  type Staff, type InsertStaff, staffMembers,
  type Implant, type InsertImplant, implants,
  type Activity, type InsertActivity, activityLog,
  type CatalogItem, type InsertCatalog, catalogItems,
  appSettings,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { createHash } from "crypto";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

// Use /data/data.db on Render (persistent disk) or local data.db in dev
const DB_PATH = process.env.NODE_ENV === "production" ? "/data/data.db" : "data.db";
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Staff
  getStaff(): Staff[];
  getStaffById(id: number): Staff | undefined;
  createStaff(staff: InsertStaff): Staff;
  deleteStaff(id: number): void;
  updateStaff(id: number, data: Partial<InsertStaff>): Staff | undefined;

  // Catalog
  getCatalog(): CatalogItem[];
  getCatalogByLine(line: string): CatalogItem[];
  searchCatalog(query: string): CatalogItem[];

  // Implants
  getImplants(): Implant[];
  getImplantById(id: number): Implant | undefined;
  getImplantByQr(qrData: string): Implant | undefined;
  getImplantByLot(lotNumber: string): Implant | undefined;
  searchImplants(query: string): Implant[];
  // Face ID / WebAuthn
  getStaffWebAuthnCredential(staffId: number): string | null;
  setStaffWebAuthnCredential(staffId: number, credentialId: string): void;
  createImplant(implant: InsertImplant): Implant;
  updateImplant(id: number, data: Partial<InsertImplant>): Implant | undefined;
  deleteImplant(id: number): void;

  // Activity
  getActivities(limit?: number): Activity[];
  getActivitiesByImplant(implantId: number): Activity[];
  createActivity(activity: InsertActivity): Activity;

  // Staff PIN
  setStaffPin(id: number, pin: string): boolean;
  verifyStaffPin(id: number, pin: string): boolean;
  resetStaffPin(id: number): boolean;

  // Settings
  getSetting(key: string): string | undefined;
  setSetting(key: string, value: string): void;

  // Analytics
  getMostUsedSizes(limit?: number): { diameter: string; length: string; body: string; line: string; count: number }[];
  getLowStockItems(threshold: number): { diameter: string; length: string; body: string; line: string; inStockCount: number }[];
}

export class DatabaseStorage implements IStorage {
  constructor() {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'assistant'
      );
      CREATE TABLE IF NOT EXISTS catalog_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        line TEXT NOT NULL,
        body TEXT NOT NULL,
        surface TEXT NOT NULL,
        diameter TEXT NOT NULL,
        length TEXT NOT NULL,
        ref_number TEXT NOT NULL,
        connection TEXT NOT NULL DEFAULT 'Grand Morse',
        platform TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS implants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_data TEXT NOT NULL,
        catalog_id INTEGER,
        brand TEXT NOT NULL DEFAULT '',
        product_name TEXT NOT NULL DEFAULT '',
        lot_number TEXT NOT NULL DEFAULT '',
        ref_number TEXT NOT NULL DEFAULT '',
        size TEXT NOT NULL DEFAULT '',
        diameter TEXT NOT NULL DEFAULT '',
        length TEXT NOT NULL DEFAULT '',
        expiration_date TEXT NOT NULL DEFAULT '',
        supplier TEXT NOT NULL DEFAULT '',
        cost TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'in',
        added_by TEXT NOT NULL DEFAULT '',
        added_at TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        implant_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Add catalog_id column if missing (migration for existing DBs)
    try {
      sqlite.exec(`ALTER TABLE implants ADD COLUMN catalog_id INTEGER`);
    } catch {}

    // Add pin column to staff_members if missing (migration for staff passwords)
    try {
      sqlite.exec(`ALTER TABLE staff_members ADD COLUMN pin TEXT NOT NULL DEFAULT ''`);
    } catch {}

    // Seed staff
    const staffCount = (sqlite.prepare("SELECT COUNT(*) as c FROM staff_members").get() as any).c;
    if (staffCount === 0) {
      sqlite.exec(`
        INSERT INTO staff_members (name, role) VALUES ('Dr. Destine', 'dentist');
        INSERT INTO staff_members (name, role) VALUES ('Aline', 'assistant');
        INSERT INTO staff_members (name, role) VALUES ('Noemy', 'assistant');
        INSERT INTO staff_members (name, role) VALUES ('Myrella', 'assistant');
        INSERT INTO staff_members (name, role) VALUES ('Sasha', 'assistant');
        INSERT INTO staff_members (name, role) VALUES ('Damaris', 'assistant');
        INSERT INTO staff_members (name, role) VALUES ('Hanny', 'assistant');
        INSERT INTO staff_members (name, role) VALUES ('Amanda', 'assistant');
      `);
    }

    // Seed catalog
    const catCount = (sqlite.prepare("SELECT COUNT(*) as c FROM catalog_items").get() as any).c;
    if (catCount === 0) {
      this.seedCatalog();
    }

    // Migration: create webauthn_credentials table
    sqlite.exec(`CREATE TABLE IF NOT EXISTS webauthn_credentials (
      staff_id INTEGER PRIMARY KEY,
      credential_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    // Migration: add or fix MUA items
    // Always rebuild MUAs to fix any incorrect GH mapping (idempotent)
    sqlite.exec(`DELETE FROM catalog_items WHERE platform = 'MUA'`);
    const insert = sqlite.prepare(
      `INSERT INTO catalog_items (brand, line, body, surface, diameter, length, ref_number, connection, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const muaBatch = sqlite.transaction((items: any[]) => {
      for (const i of items) insert.run(i.brand, i.line, i.body, i.surface, i.diameter, i.length, i.ref, i.connection, i.platform);
    });
    muaBatch(this.buildMuaItems());
  }

  private seedCatalog() {
    const insert = sqlite.prepare(
      `INSERT INTO catalog_items (brand, line, body, surface, diameter, length, ref_number, connection, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const batch = sqlite.transaction((items: any[]) => {
      for (const i of items) {
        insert.run(i.brand, i.line, i.body, i.surface, i.diameter, i.length, i.ref, i.connection, i.platform);
      }
    });

    const items: any[] = [];
    const nd = "Neodent";

    // =============================================
    // HELIX GM — Acqua surface
    // =============================================
    const helixGmDiameters = [
      { d: "3.5", refs: { "8.0": "140.943", "10.0": "140.944", "11.5": "140.945", "13.0": "140.946", "16.0": "140.947", "18.0": "140.988" } },
      { d: "3.75", refs: { "8.0": "140.953", "10.0": "140.954", "11.5": "140.955", "13.0": "140.956", "16.0": "140.957", "18.0": "140.990" } },
      { d: "4.0", refs: { "8.0": "140.976", "10.0": "140.977", "11.5": "140.978", "13.0": "140.979", "16.0": "140.980", "18.0": "140.981" } },
      { d: "4.3", refs: { "8.0": "140.982", "10.0": "140.983", "11.5": "140.984", "13.0": "140.985", "16.0": "140.986", "18.0": "140.987" } },
      { d: "5.0", refs: { "8.0": "140.948", "10.0": "140.949", "11.5": "140.950", "13.0": "140.951", "16.0": "140.952", "18.0": "140.989" } },
      { d: "6.0", refs: { "8.0": "140.1009", "10.0": "140.1010", "11.5": "140.1011", "13.0": "140.1012" } },
      { d: "7.0", refs: { "8.0": "140.1059", "10.0": "140.1060", "11.5": "140.1061", "13.0": "140.1062" } },
    ];
    for (const diam of helixGmDiameters) {
      for (const [len, ref] of Object.entries(diam.refs)) {
        items.push({ brand: nd, line: "Grand Morse", body: "Helix", surface: "Acqua", diameter: diam.d, length: len, ref, connection: "Grand Morse", platform: "GM" });
      }
    }

    // =============================================
    // DRIVE GM — Acqua surface
    // =============================================
    const driveGmDiameters = [
      { d: "3.5", refs: { "8.0": "140.958", "10.0": "140.959", "11.5": "140.960", "13.0": "140.961", "16.0": "140.962", "18.0": "140.963" } },
      { d: "4.3", refs: { "8.0": "140.964", "10.0": "140.965", "11.5": "140.966", "13.0": "140.967", "16.0": "140.968", "18.0": "140.969" } },
      { d: "5.0", refs: { "8.0": "140.970", "10.0": "140.971", "11.5": "140.972", "13.0": "140.973", "16.0": "140.974", "18.0": "140.975" } },
    ];
    for (const diam of driveGmDiameters) {
      for (const [len, ref] of Object.entries(diam.refs)) {
        items.push({ brand: nd, line: "Grand Morse", body: "Drive", surface: "Acqua", diameter: diam.d, length: len, ref, connection: "Grand Morse", platform: "GM" });
      }
    }

    // =============================================
    // TITAMAX GM — Acqua surface
    // =============================================
    const titamaxGmDiameters = [
      { d: "3.5", refs: { "7.0": "140.906", "8.0": "140.907", "9.0": "140.908", "11.0": "140.909", "13.0": "140.910", "15.0": "140.911", "17.0": "140.912" } },
      { d: "3.75", refs: { "7.0": "140.899", "8.0": "140.900", "9.0": "140.901", "11.0": "140.902", "13.0": "140.903", "15.0": "140.904", "17.0": "140.905" } },
      { d: "4.0", refs: { "7.0": "140.913", "8.0": "140.914", "9.0": "140.915", "11.0": "140.916", "13.0": "140.917", "15.0": "140.918", "17.0": "140.919" } },
      { d: "5.0", refs: { "7.0": "140.920", "8.0": "140.921", "9.0": "140.922", "11.0": "140.923", "13.0": "140.924" } },
    ];
    for (const diam of titamaxGmDiameters) {
      for (const [len, ref] of Object.entries(diam.refs)) {
        items.push({ brand: nd, line: "Grand Morse", body: "Titamax", surface: "Acqua", diameter: diam.d, length: len, ref, connection: "Grand Morse", platform: "GM" });
      }
    }

    // =============================================
    // HELIX GM NARROW — Acqua (Ø2.9 only)
    // =============================================
    const narrowRefs: Record<string, string> = { "10.0": "140.1063", "12.0": "140.1064", "14.0": "140.1065" };
    for (const [len, ref] of Object.entries(narrowRefs)) {
      items.push({ brand: nd, line: "GM Narrow", body: "Helix", surface: "Acqua", diameter: "2.9", length: len, ref, connection: "Grand Morse", platform: "GM Narrow" });
    }

    // =============================================
    // HELIX SHORT — Acqua surface
    // =============================================
    const helixShortDiameters = [
      { d: "3.75", refs: { "4.0": "140.1066", "5.5": "140.1067", "7.0": "140.1068", "8.5": "140.1069" } },
      { d: "4.0", refs: { "4.0": "140.1082", "5.5": "140.1083", "7.0": "140.1084", "8.5": "140.1085" } },
      { d: "5.0", refs: { "4.0": "140.1070", "5.5": "140.1071", "7.0": "140.1072", "8.5": "140.1073" } },
      { d: "6.0", refs: { "4.0": "140.1074", "5.5": "140.1075", "7.0": "140.1076", "8.5": "140.1077" } },
      { d: "7.0", refs: { "4.0": "140.1078", "5.5": "140.1079", "7.0": "140.1080", "8.5": "140.1081" } },
    ];
    for (const diam of helixShortDiameters) {
      for (const [len, ref] of Object.entries(diam.refs)) {
        items.push({ brand: nd, line: "Helix Short", body: "Helix Short", surface: "Acqua", diameter: diam.d, length: len, ref, connection: "Helix Short", platform: "HS" });
      }
    }

    // =============================================
    // GM MUA — Multi-Unit Abutments (Grand Morse)
    // body=MUA, surface=angle, diameter=GH, length="MUA"
    // =============================================
    const muaItems = this.buildMuaItems();
    for (const m of muaItems) items.push(m);

    batch(items);
  }

  private buildMuaItems(): any[] {
    const nd = "Neodent";
    const items: any[] = [];

    // Straight 0° MUAs — REF order confirmed by physical box (115.245 = 2.5mm)
    const straight: Record<string, string> = {
      "0.8": "115.243",
      "1.5": "115.244",
      "2.5": "115.245",
      "3.5": "115.246",
      "4.5": "115.247",
      "5.5": "115.248",
    };
    for (const [gh, ref] of Object.entries(straight)) {
      items.push({ brand: nd, line: "Grand Morse", body: "MUA", surface: "0°", diameter: gh, length: "MUA", ref, connection: "Grand Morse", platform: "MUA" });
    }

    // Angled 17° MUAs — gingival heights: 1.5, 2.5, 3.5
    const angled17: Record<string, string> = {
      "1.5": "115.275",
      "2.5": "115.276",
      "3.5": "115.277",
    };
    for (const [gh, ref] of Object.entries(angled17)) {
      items.push({ brand: nd, line: "Grand Morse", body: "MUA", surface: "17°", diameter: gh, length: "MUA", ref, connection: "Grand Morse", platform: "MUA" });
    }

    // Angled 30° MUAs — gingival heights: 1.5, 2.5, 3.5
    const angled30: Record<string, string> = {
      "1.5": "115.278",
      "2.5": "115.279",
      "3.5": "115.280",
    };
    for (const [gh, ref] of Object.entries(angled30)) {
      items.push({ brand: nd, line: "Grand Morse", body: "MUA", surface: "30°", diameter: gh, length: "MUA", ref, connection: "Grand Morse", platform: "MUA" });
    }

    return items;
  }

  // Staff
  getStaff(): (Staff & { hasPin: boolean })[] {
    return db.select().from(staffMembers).all().map(s => ({
      ...s,
      pin: "", // never expose pin hash to client
      hasPin: s.pin !== "",
    }));
  }
  getStaffById(id: number): Staff | undefined { return db.select().from(staffMembers).where(eq(staffMembers.id, id)).get(); }
  createStaff(staff: InsertStaff): Staff { return db.insert(staffMembers).values(staff).returning().get(); }
  deleteStaff(id: number): void { db.delete(staffMembers).where(eq(staffMembers.id, id)).run(); }
  updateStaff(id: number, data: Partial<InsertStaff>): Staff | undefined {
    const existing = this.getStaffById(id);
    if (!existing) return undefined;
    db.update(staffMembers).set(data).where(eq(staffMembers.id, id)).run();
    return this.getStaffById(id);
  }

  // Catalog
  getCatalog(): CatalogItem[] { return db.select().from(catalogItems).all(); }
  getCatalogByLine(line: string): CatalogItem[] { return db.select().from(catalogItems).where(eq(catalogItems.line, line)).all(); }
  searchCatalog(query: string): CatalogItem[] {
    const p = `%${query}%`;
    return db.select().from(catalogItems).where(
      or(like(catalogItems.body, p), like(catalogItems.line, p), like(catalogItems.refNumber, p), like(catalogItems.diameter, p), like(catalogItems.length, p))
    ).all();
  }

  // Implants
  getImplants(): Implant[] { return db.select().from(implants).all(); }
  getImplantById(id: number): Implant | undefined { return db.select().from(implants).where(eq(implants.id, id)).get(); }
  getImplantByQr(qrData: string): Implant | undefined { return db.select().from(implants).where(eq(implants.qrData, qrData)).get(); }
  getImplantByLot(lotNumber: string): Implant | undefined { return db.select().from(implants).where(eq(implants.lotNumber, lotNumber)).get(); }
  getStaffWebAuthnCredential(staffId: number): string | null {
    const row = sqlite.prepare(`SELECT credential_id FROM webauthn_credentials WHERE staff_id = ?`).get(staffId) as any;
    return row ? row.credential_id : null;
  }
  setStaffWebAuthnCredential(staffId: number, credentialId: string): void {
    sqlite.prepare(`INSERT OR REPLACE INTO webauthn_credentials (staff_id, credential_id) VALUES (?, ?)`).run(staffId, credentialId);
  }
  searchImplants(query: string): Implant[] {
    const p = `%${query}%`;
    return db.select().from(implants).where(
      or(like(implants.brand, p), like(implants.productName, p), like(implants.lotNumber, p), like(implants.refNumber, p), like(implants.supplier, p), like(implants.qrData, p))
    ).all();
  }
  createImplant(implant: InsertImplant): Implant { return db.insert(implants).values(implant).returning().get(); }
  updateImplant(id: number, data: Partial<InsertImplant>): Implant | undefined {
    const existing = this.getImplantById(id);
    if (!existing) return undefined;
    db.update(implants).set(data).where(eq(implants.id, id)).run();
    return this.getImplantById(id);
  }
  deleteImplant(id: number): void { db.delete(implants).where(eq(implants.id, id)).run(); }

  // Activity
  getActivities(limit = 50): Activity[] { return db.select().from(activityLog).orderBy(desc(activityLog.id)).limit(limit).all(); }
  getActivitiesByImplant(implantId: number): Activity[] { return db.select().from(activityLog).where(eq(activityLog.implantId, implantId)).orderBy(desc(activityLog.id)).all(); }
  createActivity(activity: InsertActivity): Activity { return db.insert(activityLog).values(activity).returning().get(); }

  // Staff PIN
  setStaffPin(id: number, pin: string): boolean {
    const staff = this.getStaffById(id);
    if (!staff) return false;
    const hashed = hashPin(pin);
    db.update(staffMembers).set({ pin: hashed }).where(eq(staffMembers.id, id)).run();
    return true;
  }

  verifyStaffPin(id: number, pin: string): boolean {
    const staff = this.getStaffById(id);
    if (!staff) return false;
    if (staff.pin === "") return false; // no pin set
    return staff.pin === hashPin(pin);
  }

  resetStaffPin(id: number): boolean {
    const staff = this.getStaffById(id);
    if (!staff) return false;
    db.update(staffMembers).set({ pin: "" }).where(eq(staffMembers.id, id)).run();
    return true;
  }

  // Settings
  getSetting(key: string): string | undefined {
    const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
    return row?.value;
  }
  setSetting(key: string, value: string): void {
    const existing = this.getSetting(key);
    if (existing !== undefined) {
      db.update(appSettings).set({ value }).where(eq(appSettings.key, key)).run();
    } else {
      db.insert(appSettings).values({ key, value }).run();
    }
  }

  // Analytics: most checked-out implant sizes
  getMostUsedSizes(limit = 10): { diameter: string; length: string; body: string; line: string; count: number }[] {
    const rows = sqlite.prepare(`
      SELECT i.diameter, i.length, i.product_name as body, i.brand as line, COUNT(*) as cnt
      FROM activity_log a
      JOIN implants i ON a.implant_id = i.id
      WHERE a.action = 'checked_out' AND i.diameter != '' AND i.length != ''
      GROUP BY i.diameter, i.length
      ORDER BY cnt DESC
      LIMIT ?
    `).all(limit) as any[];
    return rows.map(r => ({ diameter: r.diameter, length: r.length, body: r.body || "", line: r.line || "", count: r.cnt }));
  }

  // Analytics: staff activity summary
  getStaffActivitySummary(): { staffName: string; totalActions: number; checkouts: number; checkins: number; added: number; lastActive: string }[] {
    const rows = sqlite.prepare(`
      SELECT 
        staff_name,
        COUNT(*) as total,
        SUM(CASE WHEN action = 'checked_out' THEN 1 ELSE 0 END) as checkouts,
        SUM(CASE WHEN action = 'checked_in' THEN 1 ELSE 0 END) as checkins,
        SUM(CASE WHEN action = 'added' THEN 1 ELSE 0 END) as added,
        MAX(timestamp) as last_active
      FROM activity_log
      GROUP BY staff_name
      ORDER BY total DESC
    `).all() as any[];
    return rows.map(r => ({
      staffName: r.staff_name,
      totalActions: r.total,
      checkouts: r.checkouts,
      checkins: r.checkins,
      added: r.added,
      lastActive: r.last_active,
    }));
  }

  // Analytics: staff activity for a specific person
  getStaffActivities(staffName: string, limit = 100): Activity[] {
    return sqlite.prepare(`
      SELECT * FROM activity_log WHERE staff_name = ? ORDER BY id DESC LIMIT ?
    `).all(staffName, limit) as any[];
  }

  // Analytics: low stock items (in-stock count by size)
  getLowStockItems(threshold: number): { diameter: string; length: string; body: string; line: string; inStockCount: number }[] {
    const rows = sqlite.prepare(`
      SELECT diameter, length, product_name as body, brand as line, COUNT(*) as cnt
      FROM implants
      WHERE status = 'in' AND diameter != '' AND length != ''
      GROUP BY diameter, length
      HAVING cnt <= ?
      ORDER BY cnt ASC
    `).all(threshold) as any[];
    return rows.map(r => ({ diameter: r.diameter, length: r.length, body: r.body || "", line: r.line || "", inStockCount: r.cnt }));
  }
}

export const storage = new DatabaseStorage();
