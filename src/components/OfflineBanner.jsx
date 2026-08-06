import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600 text-stone-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
      <WifiOff size={16} />
      <span>Offline Mode — Changes will sync automatically when connection is restored.</span>
    </div>
  );
}
