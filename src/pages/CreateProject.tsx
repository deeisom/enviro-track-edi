import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createProject, getAllClients, getAllProjects } from "@/services/storage";
import { PROJECT_STATUSES, ProjectStatus, Client } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Leaf } from "lucide-react";

export default function CreateProject() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    clientId: "",
    location: "",
    assignedTo: "",
    notes: "",
    status: "1.0" as ProjectStatus,
    parentProjectId: "",
  });

  useEffect(() => {
    setClients(getAllClients());
  }, []);

  const existingProjects = getAllProjects();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Project name is required", variant: "destructive" });
      return;
    }

    const project = createProject({
      name: form.name.trim(),
      description: form.description.trim(),
      clientId: form.clientId || null,
      contactId: null,
      location: form.location.trim(),
      assignedTo: form.assignedTo ? form.assignedTo.split(",").map(s => s.trim()) : [],
      notes: form.notes.trim(),
      status: form.status,
      parentProjectId: form.parentProjectId || null,
    });

    toast({ title: `Project ${project.projectNumber} created!` });
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-frontier font-bold italic tracking-wide mb-6 flex items-center gap-2">Create New Project <Leaf className="h-5 w-5 text-primary" /></h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Phase I ESA — Elm Street Property"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief project description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <SelectItem value="_none" disabled>No clients yet</SelectItem>
                    ) : (
                      clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Initial Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ProjectStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map(s => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} — {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Site Address</Label>
              <Input
                id="location"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="123 Main St, City, State"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned">Assigned Team Members</Label>
              <Input
                id="assigned"
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                placeholder="Comma-separated names"
              />
            </div>

            <div className="space-y-2">
              <Label>Parent Project (optional)</Label>
              <Select value={form.parentProjectId} onValueChange={v => setForm(f => ({ ...f, parentProjectId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {existingProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.projectNumber} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Create Project</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
