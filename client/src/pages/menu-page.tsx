import { Link } from "wouter";
import { useSession } from "@/lib/session-context";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Search, User, Settings, BookOpen, BarChart3, Users, ClipboardList, ScanLine,
  LogOut, Info, Smartphone, ChevronRight, Shield, Bell, Tags, Package
} from "lucide-react";

export default function MenuPage() {
  const { staffName, staffRole, logout } = useSession();
  const [search, setSearch] = useState("");

  const allSections = [
    {
      items: [
        { icon: BarChart3, label: "Dashboard", href: "/", desc: "Overview & KPIs" },
        { icon: Search, label: "Search", href: "/search", desc: "Find items & catalog" },
        { icon: ClipboardList, label: "Staff Report", href: "/staff-report", desc: "Activity by person" },
        { icon: BookOpen, label: "Library", href: "/library", desc: "Neodent catalog" },
      ],
    },
    {
      items: [
        { icon: ScanLine, label: "Scan", href: "/scan", desc: "Barcode & QR scanner" },
        { icon: Package, label: "Items", href: "/items", desc: "Inventory list" },
        { icon: ClipboardList, label: "Activity Log", href: "/activity", desc: "Full history" },
      ],
    },
    {
      items: [
        { icon: Users, label: "Manage Staff", href: "/settings", desc: "Add, edit, remove team" },
        { icon: Shield, label: "Passwords", href: "/settings", desc: "Staff login security" },
        { icon: Bell, label: "Alert Settings", href: "/settings", desc: "Low stock thresholds" },
      ],
    },
    {
      items: [
        { icon: Info, label: "About", href: "/settings", desc: "App info & version" },
      ],
    },
  ];

  // Filter sections by search
  const q = search.toLowerCase();
  const filtered = q
    ? allSections.map(s => ({
        ...s,
        items: s.items.filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)),
      })).filter(s => s.items.length > 0)
    : allSections;

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Header — Shortly style */}
      <h1 className="text-[28px] font-bold tracking-tight leading-tight mb-4" data-testid="text-menu-title">Menu</h1>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-menu-search"
          type="search"
          placeholder="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-white dark:bg-card border-border/40 text-[14px]"
        />
      </div>

      {/* Profile card */}
      <div className="rounded-2xl bg-white dark:bg-card border border-border/40 p-4 flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-primary">{staffName?.charAt(0) || "?"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold">{staffName || "Not signed in"}</div>
          <div className="text-[12px] text-muted-foreground capitalize">{staffRole || ""} · 88 Smile Designs</div>
        </div>
      </div>

      {/* Menu sections — Shortly style grouped cards */}
      <div className="space-y-3">
        {filtered.map((section, sIdx) => (
          <div key={sIdx} className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden divide-y divide-border/20">
            {section.items.map((item, iIdx) => {
              const Icon = item.icon;
              return (
                <Link key={iIdx} href={item.href}>
                  <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer" data-testid={`menu-item-${item.label.toLowerCase().replace(/\s/g, "-")}`}>
                    <Icon className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.6} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium">{item.label}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Sign out */}
        <div className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-muted/20 transition-colors"
            data-testid="button-menu-signout"
          >
            <LogOut className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.6} />
            <span className="text-[14px] font-medium">Sign out</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 ml-auto" />
          </button>
        </div>

        {/* PWA hint */}
        <div className="rounded-2xl bg-primary/5 dark:bg-primary/8 border border-primary/10 p-4 flex gap-3 items-start">
          <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Add this app to your iPhone home screen — tap the{" "}
            <span className="font-medium text-foreground">Share</span> button in Safari, then{" "}
            <span className="font-medium text-foreground">"Add to Home Screen."</span>
          </p>
        </div>

        {/* Version footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-[11px] text-muted-foreground/50 font-medium">Version 2.0.0</p>
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mt-0.5">88 Smile Designs · Mount Vernon, NY</p>
        </div>
      </div>
    </div>
  );
}
