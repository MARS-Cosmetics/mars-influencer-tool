"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MarsLogo } from "@/components/mars-logo";
import {
  LayoutDashboard,
  Users,
  Handshake,
  Building2,
  Megaphone,
  Package,
  Truck,
  Image,
  CreditCard,
  FileText,
  FileSignature,
  Receipt,
  Lightbulb,
  ShoppingBag,
  Flame,
  Settings,
  Globe,
  Trophy,
  Search,
  UserCog,
} from "lucide-react";

const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Influencers", href: "/influencers", icon: Users },
      { label: "Discover", href: "/discover", icon: Search },
      { label: "Collaborations", href: "/collaborations", icon: Handshake },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
      { label: "Agencies", href: "/agencies", icon: Building2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "PR Parcels", href: "/pr-parcels", icon: Truck },
      { label: "Assets", href: "/assets", icon: Image },
      { label: "Content Ideas", href: "/content-ideas", icon: Lightbulb },
      { label: "Shopify Sync", href: "/settings/shopify", icon: ShoppingBag },
      { label: "Viral Content", href: "/viral-content", icon: Flame },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Contracts", href: "/contracts", icon: FileSignature },
      { label: "Payment Terms", href: "/payment-terms", icon: Receipt },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Allowed Domains", href: "/settings/domains", icon: Globe },
      { label: "Users", href: "/settings/users", icon: UserCog },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] flex-col bg-black text-white">
      {/* Logo + Environment Badge */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
        <MarsLogo variant="white" className="h-7" />
        {process.env.NEXT_PUBLIC_APP_ENV !== "production" && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            process.env.NEXT_PUBLIC_APP_ENV === "uat"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-green-500/20 text-green-400"
          }`}>
            {process.env.NEXT_PUBLIC_APP_ENV || "DEV"}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                      isActive
                        ? "bg-[#A6192E] text-white shadow-sm shadow-[#A6192E]/20"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        isActive
                          ? "text-white"
                          : "text-white/40 group-hover:text-white/60"
                      )}
                      strokeWidth={1.8}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t border-white/10 px-3 py-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
            pathname === "/settings"
              ? "bg-[#A6192E] text-white"
              : "text-white/50 hover:bg-white/5 hover:text-white/80"
          )}
        >
          <Settings className="h-[18px] w-[18px] text-white/40" strokeWidth={1.8} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
