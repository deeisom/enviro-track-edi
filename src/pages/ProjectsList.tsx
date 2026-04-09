import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllProjects, getAllClients } from "@/services/storage";
import { Project, Client, PROJECT_STATUSES, getStatusDef } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Leaf } from "lucide-react";

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setProjects(getAllProjects());
    setClients(getAllClients());
  }, []);

  const getClientName = (id: string | null) =>
    id ? clients.find(c => c.id === id)?.companyName || "—" : "—";

  const archiveStatuses = ["1.1", "6.0", "7.0"];

  const filtered = projects
    .filter(p => {
      if (search) {
        const q = search.toLowerCase();
        return (
          p.projectNumber.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          getClientName(p.clientId).toLowerCase().includes(q)
        );
      }
      return true;
    })
    .filter(p => statusFilter === "all" || p.status === statusFilter);

  const active = filtered.filter(p => !archiveStatuses.includes(p.status));
  const archived = filtered.filter(p => archiveStatuses.includes(p.status));

  const renderTable = (items: Project[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No projects found
            </TableCell>
          </TableRow>
        ) : (
          items.map(p => (
            <TableRow key={p.id} className="cursor-pointer hover:bg-accent/50">
              <TableCell>
                <Link to={`/projects/${p.id}`} className="font-mono font-medium text-primary hover:underline">
                  {p.projectNumber}
                </Link>
              </TableCell>
              <TableCell>
                <Link to={`/projects/${p.id}`} className="hover:underline">{p.name}</Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{getClientName(p.clientId)}</TableCell>
              <TableCell><StatusBadge status={p.status} /></TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(p.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-frontier font-bold italic tracking-wide flex items-center gap-2">Projects <Leaf className="h-5 w-5 text-primary" /></h1>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number, name, or client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROJECT_STATUSES.map(s => (
              <SelectItem key={s.code} value={s.code}>
                {s.code} — {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">{renderTable(active)}</TabsContent>
        <TabsContent value="archived">{renderTable(archived)}</TabsContent>
      </Tabs>
    </div>
  );
}
