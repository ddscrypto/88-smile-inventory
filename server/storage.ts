import {
  type Staff, type InsertStaff, staffMembers,
  type Implant, type InsertImplant, implants,
  type Activity, type InsertActivity, activityLog,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, or } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Staff
  getStaff(): Staff[];
  getStaffById(id: number): Staff | undefined;
  createStaff(staff: InsertStaff): Staff;
  deleteStaff(id: number): void;

  // Implants
  getImplants(): Implant[];
  getImplantById(id: number): Implant | undefined;
  getImplantByQr(qrData: string): Implant | undefined;
  searchImplants(query: string): Implant[];
  createImplant(implant: InsertImplant): Implant;
  updateImplant(id: number, data: Partial<InsertImplant>): Implant | undefined;
  deleteImplant(id: number): void;

  // Activity
  getActivities(limit?: number): Activity[];
  getActivitiesByImplant(implantId: number): Activity[];
  createActivity(activity: InsertActivity): Activity;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'assistant'
      );
      CREATE TABLE IF NOT EXISTS implants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_data TEXT NOT NULL,
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
    `);

    // Seed default staff if empty
    const count = sqlite.prepare("SELECT COUNT(*) as c FROM staff_members").get() as any;
    if (count.c === 0) {
      sqlite.exec(`
        INSERT INTO staff_members (name, role) VALUES ('Dr. Destine', 'dentist');
        INSERT INTO staff_members (name, role) VALUES ('Front Desk', 'admin');
      `);
    }
  }

  // Staff
  getStaff(): Staff[] {
    return db.select().from(staffMembers).all();
  }

  getStaffById(id: number): Staff | undefined {
    return db.select().from(staffMembers).where(eq(staffMembers.id, id)).get();
  }

  createStaff(staff: InsertStaff): Staff {
    return db.insert(staffMembers).values(staff).returning().get();
  }

  deleteStaff(id: number): void {
    db.delete(staffMembers).where(eq(staffMembers.id, id)).run();
  }

  // Implants
  getImplants(): Implant[] {
    return db.select().from(implants).all();
  }

  getImplantById(id: number): Implant | undefined {
    return db.select().from(implants).where(eq(implants.id, id)).get();
  }

  getImplantByQr(qrData: string): Implant | undefined {
    return db.select().from(implants).where(eq(implants.qrData, qrData)).get();
  }

  searchImplants(query: string): Implant[] {
    const pattern = `%${query}%`;
    return db.select().from(implants).where(
      or(
        like(implants.brand, pattern),
        like(implants.productName, pattern),
        like(implants.lotNumber, pattern),
        like(implants.refNumber, pattern),
        like(implants.supplier, pattern),
        like(implants.qrData, pattern),
      )
    ).all();
  }

  createImplant(implant: InsertImplant): Implant {
    return db.insert(implants).values(implant).returning().get();
  }

  updateImplant(id: number, data: Partial<InsertImplant>): Implant | undefined {
    const existing = this.getImplantById(id);
    if (!existing) return undefined;
    db.update(implants).set(data).where(eq(implants.id, id)).run();
    return this.getImplantById(id);
  }

  deleteImplant(id: number): void {
    db.delete(implants).where(eq(implants.id, id)).run();
  }

  // Activity
  getActivities(limit = 50): Activity[] {
    return db.select().from(activityLog).orderBy(desc(activityLog.id)).limit(limit).all();
  }

  getActivitiesByImplant(implantId: number): Activity[] {
    return db.select().from(activityLog).where(eq(activityLog.implantId, implantId)).orderBy(desc(activityLog.id)).all();
  }

  createActivity(activity: InsertActivity): Activity {
    return db.insert(activityLog).values(activity).returning().get();
  }
}

export const storage = new DatabaseStorage();
