import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { createProject, getAllClients, getAllProjects } from "@/services/storage";
import { PROJECT_STATUSES, ProjectStatus, Client, Project } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Leaf, Check, ChevronsUpDown } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { cn } from "@/lib/utils";

export default function CreateProject() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [useManualNumber, setUseManualNumber] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    clientId: "",
    location: "",
    assignedTo: "",
    notes: "",
    status: "1.0" as ProjectStatus,
    parentProjectId: "",
    manualProjectNumber: "",
  });

  useEffect(() => {
    getAllClients().then(setClients);
    getAllProjects().then(setExistingProjects);
  }, []);

  const selectedClient = useMemo(
    () => clients.find(c => c.id === form.clientId),
    [clients, form.clientId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Project name is required", variant: "destructive" });
      return;
    }
    if (useManualNumber && !form.manualProjectNumber.trim()) {
      toast({ title: "Project number is required when using manual entry", variant: "destructive" });
      return;
    }

    try {
      const project = await createProject({
        name: form.name.trim(),
        description: form.description.trim(),
        clientId: (form.clientId && form.clientId !== "_none") ? form.clientId : null,
        contactId: null,
        location: form.location.trim(),
        assignedTo: form.assignedTo ? form.assignedTo.split(",").map(s => s.trim()) : [],
        notes: form.notes.trim(),
        status: form.status,
        parentProjectId: (form.parentProjectId && form.parentProjectId !== "_none") ? form.parentProjectId : null,
        ...(useManualNumber ? { manualProjectNumber: form.manualProjectNumber.trim() } : {}),
      });

      toast({ title: `Project ${project.projectNumber} created!` });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("projects_project_number_unique") || msg.includes("duplicate key")) {
        toast({ title: "That project number is already in use", description: "Please choose a different number.", variant: "destructive" });
      } else {
        toast({ title: "Error creating project", description: msg, variant: "destructive" });
      }
    }
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
            {/* Manual number toggle */}
            <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
              <Switch
                id="manual-number"
                checked={useManualNumber}
                onCheckedChange={setUseManualNumber}
              />
              <Label htmlFor="manual-number" className="cursor-pointer text-sm">
                Assign project number manually (for previously numbered projects)
              </Label>
            </div>

            {useManualNumber && (
              <div className="space-y-2">
                <Label htmlFor="projectNumber">Project Number *</Label>
                <Input
                  id="projectNumber"
                  value={form.manualProjectNumber}
                  onChange={e => setForm(f => ({ ...f, manualProjectNumber: e.target.value }))}
                  placeholder="e.g. OLD-2024-0042"
                />
                <p className="text-xs text-muted-foreground">Enter the existing project number. Must be unique across all projects.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Phase I ESA — Elm Street Property" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief project description..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Searchable client combobox */}
              <div className="space-y-2">
                <Label>Client</Label>
                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={clientOpen} className="w-full justify-between font-normal">
                      {selectedClient ? selectedClient.companyName : "Select client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search clients..." />
                      <CommandList>
                        <CommandEmpty>No clients found.</CommandEmpty>
                        <CommandGroup>
                          {clients.map(c => (
                            <CommandItem
                              key={c.id}
                              value={c.companyName}
                              onSelect={() => {
                                setForm(f => ({ ...f, clientId: f.clientId === c.id ? "" : c.id }));
                                setClientOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.clientId === c.id ? "opacity-100" : "opacity-0")} />
                              {c.companyName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Initial Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ProjectStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.code} — {s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Site Address</Label>
              <AddressAutocomplete id="location" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="123 Main St, City, State" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned">Assigned Team Members</Label>
              <Input id="assigned" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Comma-separated names" />
            </div>

            <div className="space-y-2">
              <Label>Parent Project (optional)</Label>
              <Select value={form.parentProjectId} onValueChange={v => setForm(f => ({ ...f, parentProjectId: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {existingProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.projectNumber} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Create Project</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
