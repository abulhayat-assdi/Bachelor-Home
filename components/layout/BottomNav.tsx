"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, ShoppingBasket, Receipt, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProfiles } from "@/hooks/useProfiles";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/meal", label: "Meals", icon: UtensilsCrossed },
  { href: "/bazar", label: "Bazar", icon: ShoppingBasket },
  { href: "/bill", label: "Bill", icon: Receipt },
];

export function BottomNav() {
  const pathname = usePathname();
  const { me } = useProfiles();
  const tabs = me?.role === "admin"
    ? [...TABS, { href: "/admin", label: "Admin", icon: Shield }]
    : TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border-c bg-bg/90 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted hover:text-text"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute -top-px h-0.5 w-10 rounded-full bg-primary"
                />
              )}
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
