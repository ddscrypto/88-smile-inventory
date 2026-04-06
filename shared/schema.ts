import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Staff members who use the system
export const staffMembers = sqliteTable("staff_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull().default("assistant"), // dentist, assistant, hygienist, admin
  pin: text("pin").notNull().default(""), // hashed password for staff login
});

export const insertStaffSchema = createInsertSchema(staffMembers).omit({ id: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staffMembers.$inferSelect;

// Implant catalog — pre-loaded library of implant models
export const catalogItems = sqliteTable("catalog_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brand: text("brand").notNull(),           // e.g. "Neodent"
  line: text("line").notNull(),             // e.g. "Grand Morse", "GM Narrow", "Helix Short"
  body: text("body").notNull(),             // e.g. "Helix", "Drive", "Titamax"
  surface: text("surface").notNull(),       // e.g. "Acqua", "NeoPoros"
  diameter: text("diameter").notNull(),     // e.g. "3.5"
  length: text("length").notNull(),         // e.g. "10.0"
  refNumber: text("ref_number").notNull(),  // e.g. "140.943"
  connection: text("connection").notNull().default("Grand Morse"),
  platform: text("platform").notNull().default(""),
});

export const insertCatalogSchema = createInsertSchema(catalogItems).omit({ id: true });
export type InsertCatalog = z.infer<typeof insertCatalogSchema>;
export type CatalogItem = typeof catalogItems.$inferSelect;

// Implant inventory items
export const implants = sqliteTable("implants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  qrData: text("qr_data").notNull(), // raw QR code content
  catalogId: integer("catalog_id"),   // links to catalog (null for manual/custom)
  brand: text("brand").notNull().default(""),
  productName: text("product_name").notNull().default(""),
  lotNumber: text("lot_number").notNull().default(""),
  refNumber: text("ref_number").notNull().default(""),
  size: text("size").notNull().default(""),
  diameter: text("diameter").notNull().default(""),
  length: text("length").notNull().default(""),
  expirationDate: text("expiration_date").notNull().default(""),
  supplier: text("supplier").notNull().default(""),
  cost: text("cost").notNull().default(""),
  location: text("location").notNull().default(""), // where in office
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default("in"), // in, out
  addedBy: text("added_by").notNull().default(""),
  addedAt: text("added_at").notNull(),
  lastActionAt: text("last_action_at").notNull().default(""),
  notes: text("notes").notNull().default(""),
});

export const insertImplantSchema = createInsertSchema(implants).omit({ id: true });
export type InsertImplant = z.infer<typeof insertImplantSchema>;
export type Implant = typeof implants.$inferSelect;

// Activity log for check-in/out tracking
export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  implantId: integer("implant_id").notNull(),
  action: text("action").notNull(), // checked_in, checked_out, added, updated, deleted
  staffName: text("staff_name").notNull(),
  timestamp: text("timestamp").notNull(),
  notes: text("notes").notNull().default(""),
});

export const insertActivitySchema = createInsertSchema(activityLog).omit({ id: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityLog.$inferSelect;

// App settings (key-value store)
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
