import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge, StatusTimeline } from "@/components/StatusBadge";
import {
  getProject, updateProject, changeProjectStatus, getProjectActivity,
  getClient, getContactsByClient, deleteActivity, deleteProject,
} from "@/services/storage";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Project, Client, Contact, ActivityLogEntry, PROJECT_STATUSES, ProjectStatus, getStatusDef } from "@/types";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Clock, Trash2, FileText, AlertCircle, Leaf } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<ProjectStatus>("1.0");
  const [statusNote, setStatusNote] = useState("");
  const [editForm, setEditForm] = useState({ name: "", description: "", location: "", notes: "" });

  const load = async () => {
    if (!id) return;
    const p = await getProject(id);
    if (!p) { navigate("/projects"); return; }
    setProject(p);
    setActivity(await getProjectActivity(id));
    if (p.clientId) {
      const c = await getClient(p.clientId);
      setClient(c || null);
      if (c) setContacts(await getContactsByClient(c.id));
    } else {
      setClient(null);
      setContacts([]);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!project) return null;

  const handleStatusChange = async () => {
    await changeProjectStatus(project.id, newStatus, statusNote);
    setStatusDialog(false);
    setStatusNote("");
    toast({ title: `Status updated to ${getStatusDef(newStatus).code} — ${getStatusDef(newStatus).label}` });
    load();
  };

  const handleEdit = () => {
    setEditForm({ name: project.name, description: project.description, location: project.location, notes: project.notes });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateProject(project.id, editForm);
    setEditing(false);
    toast({ title: "Project updated" });
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-primary">{project.projectNumber}</span>
            <StatusBadge status={project.status} />
          </div>
          <h1 className="text-xl font-frontier font-bold italic tracking-wide mt-1 flex items-center gap-2">{project.name} <Leaf className="h-5 w-5 text-primary" /></h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/invoices?new=1&projectId=${project.id}`}>
              <FileText className="h-4 w-4 mr-1" /> Create Invoice
            </Link>
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button onClick={() => { setNewStatus(project.status); setStatusDialog(true); }}>
            Update Status
          </Button>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this project and cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    try {
                      await deleteProject(project.id);
                      toast({ title: "Project deleted" });
                      navigate("/projects");
                    } catch (e: any) {
                      toast({ title: "Error deleting project", description: e.message, variant: "destructive" });
                    }
                  }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <StatusTimeline currentStatus={project.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {project.description && <div><span className="text-muted-foreground">Description:</span> <p>{project.description}</p></div>}
            {project.location && <div><span className="text-muted-foreground">Location:</span> <p>{project.location}</p></div>}
            {project.assignedTo.length > 0 && (
              <div><span className="text-muted-foreground">Assigned:</span> <p>{project.assignedTo.join(", ")}</p></div>
            )}
            {project.notes && <div><span className="text-muted-foreground">Notes:</span> <p>{project.notes}</p></div>}
            <div><span className="text-muted-foreground">Created:</span> <p>{new Date(project.createdAt).toLocaleString()}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Client & Contact</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {client ? (
              <div className="space-y-2">
                <p className="font-medium">
                  <Link to={`/clients/${client.id}`} className="text-primary hover:underline">{client.companyName}</Link>
                </p>
                {client.address && <p className="text-muted-foreground">{client.address}</p>}
                {contacts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="font-medium text-muted-foreground">Contacts:</p>
                    {contacts.map(c => (
                      <div key={c.id} className="pl-2 border-l-2 border-primary/20">
                        <p className="font-medium">{c.name}</p>
                        {c.title && <p className="text-muted-foreground">{c.title}</p>}
                        {c.email && <p>{c.email}</p>}
                        {c.phone && <p>{c.phone}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No client assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Activity Log</CardTitle></CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity recorded</p>
          ) : (
            <div className="space-y-3">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3">
                  <div className="text-muted-foreground text-xs w-28 shrink-0">
                    {new Date(a.timestamp).toLocaleDateString()}<br/>
                    {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                   <div className="flex-1">
                    {a.isInvoiceEvent ? (
                      <span className="text-muted-foreground">{a.note}</span>
                    ) : (
                      <>
                        {a.previousStatus && (
                          <span className="text-muted-foreground">
                            {getStatusDef(a.previousStatus).code} → {" "}
                          </span>
                        )}
                        <StatusBadge status={a.newStatus} className="text-[10px] py-0 px-1.5" />
                      </>
                    )}
                    {a.isInvoiceEvent && project && parseFloat(project.status) < 3.1 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="inline h-4 w-4 text-destructive ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Project status should be updated to 3.1 or higher to reflect invoice delivery.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {!a.isInvoiceEvent && a.note && <p className="text-muted-foreground mt-1">{a.note}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete activity log entry?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => { await deleteActivity(a.id); toast({ title: "Activity entry deleted" }); load(); }}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Project Status</DialogTitle>
            <DialogDescription>Change the status for {project.projectNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map(s => (
                    <SelectItem key={s.code} value={s.code}>{s.code} — {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Reason for status change..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleStatusChange}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details for {project.projectNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <AddressAutocomplete value={editForm.location} onChange={v => setEditForm(f => ({ ...f, location: v }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
