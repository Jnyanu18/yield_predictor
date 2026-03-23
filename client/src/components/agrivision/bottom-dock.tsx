"use client";

import type { ComponentType } from "react";
import { BarChart3, Camera, LineChart, Sparkles, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

export type DockView = "home" | "detect" | "plan" | "market" | "advisor";

const items: Array<{ id: DockView; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "detect", label: "Detect", icon: Camera },
  { id: "plan", label: "Plan", icon: CalendarDays },
  { id: "market", label: "Market", icon: LineChart },
  { id: "advisor", label: "Advisor", icon: Sparkles },
  { id: "home", label: "Main Dashboard", icon: BarChart3 },
];

export function BottomDock({
  value,
  onValueChange,
}: {
  value: DockView;
  onValueChange: (view: DockView) => void;
}) {
  return (
    <nav className="fixed left-6 top-1/2 z-50 -translate-y-1/2 print:hidden backdrop-blur-xl bg-background/50 border border-white/10 shadow-2xl rounded-3xl transition-transform">
      <div className="flex flex-col p-2 gap-2">
        {items.map(item => {
          const active = item.id === value;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onValueChange(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 w-16 h-16 text-[11px] font-medium transition-all duration-300 active:scale-[0.95]",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-foreground/5"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform", active ? "scale-110" : "scale-100")} />
              <span className="leading-none">{item.label}</span>
              {active ? <span className="absolute left-0 -translate-x-1 h-8 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(20,184,166,0.5)]" /> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
