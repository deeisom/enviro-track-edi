import { EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function ViewOnlyBanner() {
  const { canEdit } = useAuth();
  if (canEdit) return null;
  return (
    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm px-4 py-2 flex items-center gap-2 border-b border-amber-200 dark:border-amber-800">
      <EyeOff className="h-4 w-4 shrink-0" />
      <span>You have <strong>View Only</strong> access. Contact an admin to request edit permissions.</span>
    </div>
  );
}
