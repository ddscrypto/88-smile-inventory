import { useQuery } from "@tanstack/react-query";
import { Bell, ShoppingCart, AlertTriangle, Clock, Package, ChevronRight, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import type { Implant } from "@shared/schema";

interface LowStockItem {
  diameter: string;
  length: string;
  body: string;
  line: string;
  inStockCount: number;
}

export default function NotificationsPage() {
  const { data: lowStock = [] } = useQuery<LowStockItem[]>({ queryKey: ["/api/analytics/low-stock"] });
  const { data: implants = [] } = useQuery<Implant[]>({ queryKey: ["/api/implants"] });

  const expiringSoon = implants.filter(i => {
    if (!i.expirationDate) return false;
    const exp = new Date(i.expirationDate);
    const now = new Date();
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 90;
  });

  const expired = implants.filter(i => {
    if (!i.expirationDate) return false;
    return new Date(i.expirationDate) < new Date();
  });

  const checkedOut = implants.filter(i => i.status === "out");

  const hasAlerts = lowStock.length > 0 || expiringSoon.length > 0 || expired.length > 0 || checkedOut.length > 0;

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Header — Shortly style */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[28px] font-bold tracking-tight leading-tight" data-testid="text-notifications-title">Alerts</h1>
        <button className="w-10 h-10 rounded-full bg-white dark:bg-card border border-border/40 flex items-center justify-center">
          <MoreHorizontal className="w-[18px] h-[18px] text-muted-foreground" />
        </button>
      </div>

      {!hasAlerts ? (
        /* Empty state — Shortly style sleeping bell */
        <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
          <div className="w-28 h-28 rounded-3xl bg-muted/40 flex items-center justify-center mb-5">
            <Bell className="w-14 h-14 text-muted-foreground/20" strokeWidth={1} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Nothing to see here</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[280px]">
            Set alerts to stay on top of your items wherever you are.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Low Stock Alerts */}
          {lowStock.length > 0 && (
            <AlertSection
              icon={<ShoppingCart className="w-4 h-4 text-rose-500" />}
              title="Low Stock"
              subtitle={`${lowStock.length} item${lowStock.length > 1 ? "s" : ""} running low`}
              badgeColor="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
              count={lowStock.length}
            >
              {lowStock.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{item.body || item.line || "Implant"}</div>
                    <div className="text-[11px] text-muted-foreground">{item.diameter}mm x {item.length}mm</div>
                  </div>
                  <span className={`text-[13px] font-bold tabular-nums ${item.inStockCount <= 1 ? "text-red-500" : "text-rose-500"}`}>
                    {item.inStockCount} left
                  </span>
                </div>
              ))}
            </AlertSection>
          )}

          {/* Expired */}
          {expired.length > 0 && (
            <AlertSection
              icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
              title="Expired"
              subtitle={`${expired.length} item${expired.length > 1 ? "s" : ""} past expiration`}
              badgeColor="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              count={expired.length}
            >
              {expired.slice(0, 5).map(item => (
                <Link key={item.id} href={`/implant/${item.id}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{item.brand} {item.productName}</div>
                      <div className="text-[11px] text-muted-foreground">Exp: {item.expirationDate}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  </div>
                </Link>
              ))}
            </AlertSection>
          )}

          {/* Expiring Soon */}
          {expiringSoon.length > 0 && (
            <AlertSection
              icon={<Clock className="w-4 h-4 text-amber-500" />}
              title="Expiring Soon"
              subtitle={`${expiringSoon.length} item${expiringSoon.length > 1 ? "s" : ""} within 90 days`}
              badgeColor="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              count={expiringSoon.length}
            >
              {expiringSoon.slice(0, 5).map(item => (
                <Link key={item.id} href={`/implant/${item.id}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{item.brand} {item.productName}</div>
                      <div className="text-[11px] text-muted-foreground">Exp: {item.expirationDate}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  </div>
                </Link>
              ))}
            </AlertSection>
          )}

          {/* Checked Out */}
          {checkedOut.length > 0 && (
            <AlertSection
              icon={<Package className="w-4 h-4 text-blue-500" />}
              title="Checked Out"
              subtitle={`${checkedOut.length} item${checkedOut.length > 1 ? "s" : ""} currently out`}
              badgeColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              count={checkedOut.length}
            >
              {checkedOut.slice(0, 5).map(item => (
                <Link key={item.id} href={`/implant/${item.id}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{item.brand} {item.productName}</div>
                      <div className="text-[11px] text-muted-foreground">By: {item.addedBy}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  </div>
                </Link>
              ))}
            </AlertSection>
          )}
        </div>
      )}
    </div>
  );
}

function AlertSection({ icon, title, subtitle, badgeColor, count, children }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badgeColor: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border/30">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{count}</span>
      </div>
      <div className="divide-y divide-border/20">
        {children}
      </div>
    </div>
  );
}
