import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-14 w-14" }[size];
  const icon = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" }[size];
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00C896] text-white shadow-card",
        dims,
        className
      )}
    >
      <Home className={icon} />
    </div>
  );
}
