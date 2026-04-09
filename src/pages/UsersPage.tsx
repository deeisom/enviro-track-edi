import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Shield, Leaf, UserPlus, UserMinus } from "lucide-react";

interface UserRow {
  user_id: string;
  display_name: string;
  is_admin: boolean;
}

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const adminSet = new Set((roles || []).filter(r => r.role === "admin").map(r => r.user_id));

    setUsers(
      (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name || "Unknown",
        is_admin: adminSet.has(p.user_id),
      }))
    );
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast({ title: "Admin role removed" });
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" } as any);
      toast({ title: "Admin role granted" });
    }
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
        <p className="text-muted-foreground text-sm">Manage team member roles. Admins can delete records.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.display_name}</TableCell>
                  <TableCell>
                    {u.is_admin ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAdmin(u.user_id, u.is_admin)}
                    >
                      {u.is_admin ? (
                        <><UserMinus className="h-3 w-3 mr-1" /> Remove Admin</>
                      ) : (
                        <><UserPlus className="h-3 w-3 mr-1" /> Make Admin</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
