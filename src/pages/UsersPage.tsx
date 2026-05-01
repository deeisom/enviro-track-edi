import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Shield, Leaf, Trash2 } from "lucide-react";

type AppRole = "admin" | "user" | "view_only";

interface UserRow {
  user_id: string;
  display_name: string;
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  user: "User",
  view_only: "View Only",
};

const roleBadgeVariant: Record<AppRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  user: "secondary",
  view_only: "outline",
};

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [removeTarget, setRemoveTarget] = useState<UserRow | null>(null);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map<string, AppRole>();
    for (const r of roles || []) {
      roleMap.set(r.user_id, r.role as AppRole);
    }

    setUsers(
      (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name || "Unknown",
        role: roleMap.get(p.user_id) || "view_only",
      }))
    );
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: AppRole) => {
    // Delete existing role row then insert new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: newRole } as any);
    toast({ title: `Role changed to ${roleLabels[newRole]}` });
    load();
  };

  const removeMember = async (userId: string) => {
    // Remove their role and profile; they'll still exist in auth but won't appear in the app.
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast({ title: "Member removed" });
    setRemoveTarget(null);
    load();
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>Only admins can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-frontier font-bold italic tracking-wide flex items-center gap-2">
          User Management <Leaf className="h-5 w-5 text-primary" />
        </h1>
        <p className="text-muted-foreground text-sm">Manage team member roles. New signups start as View Only.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-48">Change Role</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => {
                const isSelf = u.user_id === currentUser?.id;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      {u.display_name}
                      {isSelf && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[u.role]}>{roleLabels[u.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      {!isSelf ? (
                        <Select value={u.role} onValueChange={(v) => changeRole(u.user_id, v as AppRole)}>
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="view_only">View Only</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setRemoveTarget(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.display_name}</strong>? They will lose access to the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget && removeMember(removeTarget.user_id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
