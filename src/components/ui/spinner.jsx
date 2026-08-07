import { Loader2 } from "lucide-react";

export function Spinner({ size = 20, className = "" }) {
  return <Loader2 size={size} className={`animate-spin text-amber-500 ${className}`} />;
}
