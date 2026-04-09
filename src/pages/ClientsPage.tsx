import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getAllClients, createClient, updateClient, deleteClient,
  getContactsByClient, createContact, updateContact, deleteContact,
  getAllProjects, getClient,
} from "@/services/storage";
import { Client, Contact, Project } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, ArrowLeft, Trash2, Users, Building2, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ClientsList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ companyName: "", address: "", industryType: "", notes: "" });

  const load = () => setClients(getAllClients());
  useEffect(load, []);

  const filtered = clients.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!form.companyName.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    createClient(form);
    setDialogOpen(false);
    setForm({ companyName: "", address: "", industryType: "", notes: "" });
    toast({ title: "Client created" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Clients & Contacts</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No clients yet. Add your first client to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Link key={c.id} to={`/clients/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.companyName}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {c.industryType && <p>{c.industryType}</p>}
                  {c.address && <p className="truncate">{c.address}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>Create a new client record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Company Name *</Label><Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Industry / Type</Label><Input value={form.industryType} onChange={e => setForm(f => ({ ...f, industryType: e.target.value }))} placeholder="e.g. Real Estate, Municipal, Industrial" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contactDialog, setContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "", phone: "" });
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ companyName: "", address: "", industryType: "", notes: "" });
  const [deleteDialog, setDeleteDialog] = useState(false);

  const load = () => {
    if (!id) return;
    const c = getClient(id);
    if (!c) { navigate("/clients"); return; }
    setClient(c);
    setContacts(getContactsByClient(id));
    setProjects(getAllProjects().filter(p => p.clientId === id));
  };

  useEffect(load, [id]);

  if (!client) return null;

  const handleEdit = () => {
    setEditForm({ companyName: client.companyName, address: client.address || "", industryType: client.industryType || "", notes: client.notes || "" });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.companyName.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    updateClient(client.id, editForm);
    setEditDialog(false);
    toast({ title: "Client updated" });
    load();
  };

  const handleDelete = () => {
    deleteClient(client.id);
    toast({ title: "Client deleted" });
    navigate("/clients");
  };
  const handleAddContact = () => {
    if (!contactForm.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (editingContact) {
      updateContact(editingContact.id, contactForm);
      toast({ title: "Contact updated" });
    } else {
      createContact({ ...contactForm, clientId: client.id });
      toast({ title: "Contact added" });
    }
    setContactDialog(false);
    setContactForm({ name: "", title: "", email: "", phone: "" });
    setEditingContact(null);
    load();
  };

  const handleDeleteContact = (contactId: string) => {
    deleteContact(contactId);
    toast({ title: "Contact removed" });
    load();
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({ name: contact.name, title: contact.title || "", email: contact.email || "", phone: contact.phone || "" });
    setContactDialog(true);
  };

  const openAddContact = () => {
    setEditingContact(null);
    setContactForm({ name: "", title: "", email: "", phone: "" });
    setContactDialog(true);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{client.companyName}</h1>
          {client.industryType && <p className="text-sm text-muted-foreground">{client.industryType}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={handleEdit}>
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)}>
          <Trash2 className="h-3 w-3 mr-1" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Client Info</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            {client.address && <div><span className="text-muted-foreground">Address:</span> <p>{client.address}</p></div>}
            {client.notes && <div><span className="text-muted-foreground">Notes:</span> <p>{client.notes}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Contacts</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setContactDialog(true)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet</p>
            ) : (
              <div className="space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-start justify-between border-l-2 border-primary/20 pl-3">
                    <div className="text-sm">
                      <p className="font-medium">{c.name}</p>
                      {c.title && <p className="text-muted-foreground">{c.title}</p>}
                      {c.email && <p>{c.email}</p>}
                      {c.phone && <p>{c.phone}</p>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteContact(c.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Associated Projects */}
      <Card>
        <CardHeader><CardTitle className="text-base">Associated Projects</CardTitle></CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects for this client</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/projects/${p.id}`} className="font-mono text-primary hover:underline">{p.projectNumber}</Link>
                    </TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a contact for {client.companyName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Title</Label><Input value={contactForm.title} onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Project Manager" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialog(false)}>Cancel</Button>
            <Button onClick={handleAddContact}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Client Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Company Name *</Label><Input value={editForm.companyName} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Industry / Type</Label><Input value={editForm.industryType} onChange={e => setEditForm(f => ({ ...f, industryType: e.target.value }))} placeholder="e.g. Real Estate, Municipal, Industrial" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {client.companyName}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this client and all associated contacts. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ClientsPage() {
  const { id } = useParams<{ id: string }>();
  return id ? <ClientDetail /> : <ClientsList />;
}
