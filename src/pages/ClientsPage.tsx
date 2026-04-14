import { useEffect, useState, useMemo } from "react";
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
  getAllProjects, getClient, getAllContacts,
} from "@/services/storage";
import { Client, Contact, Project } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, ArrowLeft, Trash2, Users, Building2, Pencil, Leaf, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 50;

type MatchInfo = { field: string; value: string } | null;

function ClientsList() {
  const { canEdit } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ companyName: "", address: "", industryType: "", notes: "", phone: "", fax: "", website: "" });
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);

  const load = () => {
    getAllClients().then(setClients);
    getAllContacts().then(setContacts);
  };
  useEffect(load, []);

  const contactsByClient = useMemo(() => {
    const map = new Map<string, Contact[]>();
    for (const c of contacts) {
      const arr = map.get(c.clientId) || [];
      arr.push(c);
      map.set(c.clientId, arr);
    }
    return map;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients.map(c => ({ client: c, match: null as MatchInfo }));

    return clients
      .map(c => {
        // Check client fields
        if (c.companyName.toLowerCase().includes(q)) return { client: c, match: null as MatchInfo };
        if (c.address?.toLowerCase().includes(q)) return { client: c, match: { field: "Address", value: c.address } as MatchInfo };
        if (c.industryType?.toLowerCase().includes(q)) return { client: c, match: { field: "Industry", value: c.industryType } as MatchInfo };
        if (c.phone?.toLowerCase().includes(q)) return { client: c, match: { field: "Phone", value: c.phone } as MatchInfo };
        if (c.website?.toLowerCase().includes(q)) return { client: c, match: { field: "Website", value: c.website } as MatchInfo };
        if (c.notes?.toLowerCase().includes(q)) return { client: c, match: { field: "Notes", value: c.notes.substring(0, 60) } as MatchInfo };

        // Check associated contacts
        const clientContacts = contactsByClient.get(c.id) || [];
        for (const ct of clientContacts) {
          if (ct.name.toLowerCase().includes(q)) return { client: c, match: { field: "Contact", value: ct.name } as MatchInfo };
          if (ct.email?.toLowerCase().includes(q)) return { client: c, match: { field: "Contact email", value: `${ct.name} (${ct.email})` } as MatchInfo };
          if (ct.phone?.toLowerCase().includes(q)) return { client: c, match: { field: "Contact phone", value: `${ct.name} (${ct.phone})` } as MatchInfo };
          if (ct.mobilePhone?.toLowerCase().includes(q)) return { client: c, match: { field: "Contact mobile", value: `${ct.name} (${ct.mobilePhone})` } as MatchInfo };
          if (ct.secondaryEmail?.toLowerCase().includes(q)) return { client: c, match: { field: "Contact email", value: `${ct.name} (${ct.secondaryEmail})` } as MatchInfo };
        }
        return null;
      })
      .filter(Boolean) as { client: Client; match: MatchInfo }[];
  }, [clients, contacts, contactsByClient, search]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = async () => {
    if (!form.companyName.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    try {
      await createClient(form);
      setDialogOpen(false);
      setForm({ companyName: "", address: "", industryType: "", notes: "", phone: "", fax: "", website: "" });
      toast({ title: "Client created" });
      load();
    } catch (err: any) {
      toast({ title: "Error creating client", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-frontier font-bold italic tracking-wide flex items-center gap-2">Clients & Contacts <Leaf className="h-5 w-5 text-primary" /></h1>
        {canEdit && <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Client</Button>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients, contacts, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        <div className="flex border rounded-md overflow-hidden">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="rounded-none h-9 w-9" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="icon" className="rounded-none h-9 w-9" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>{search ? "No clients or contacts match your search." : "No clients yet. Add your first client to get started!"}</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(({ client: c, match }) => (
            <Link key={c.id} to={`/clients/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.companyName}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  {c.industryType && <p>{c.industryType}</p>}
                  {c.address && <p className="truncate">{c.address}</p>}
                  {match && (
                    <p className="text-xs text-primary truncate">
                      Matched: {match.field} — {match.value}
                    </p>
                  )}
                  {(contactsByClient.get(c.id)?.length ?? 0) > 0 && (
                    <p className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> {contactsByClient.get(c.id)!.length} contact{contactsByClient.get(c.id)!.length !== 1 ? "s" : ""}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Contacts</TableHead>
                {search && <TableHead>Matched On</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(({ client: c, match }) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => {}}>
                  <TableCell>
                    <Link to={`/clients/${c.id}`} className="font-medium text-primary hover:underline">{c.companyName}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.industryType || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell>{contactsByClient.get(c.id)?.length ?? 0}</TableCell>
                  {search && (
                    <TableCell className="text-xs text-primary truncate max-w-[200px]">
                      {match ? `${match.field}: ${match.value}` : "Company name"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
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
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Business phone" /></div>
            <div className="space-y-2"><Label>Fax</Label><Input value={form.fax} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="e.g. https://example.com" /></div>
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
  const { canEdit, isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contactDialog, setContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "", phone: "", mobilePhone: "", secondaryEmail: "" });
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ companyName: "", address: "", industryType: "", notes: "", phone: "", fax: "", website: "" });
  const [deleteDialog, setDeleteDialog] = useState(false);

  const load = async () => {
    if (!id) return;
    const c = await getClient(id);
    if (!c) { navigate("/clients"); return; }
    setClient(c);
    setContacts(await getContactsByClient(id));
    const allProjects = await getAllProjects();
    setProjects(allProjects.filter(p => p.clientId === id));
  };

  useEffect(() => { load(); }, [id]);

  if (!client) return null;

  const handleEdit = () => {
    setEditForm({ companyName: client.companyName, address: client.address || "", industryType: client.industryType || "", notes: client.notes || "", phone: client.phone || "", fax: client.fax || "", website: client.website || "" });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.companyName.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    await updateClient(client.id, editForm);
    setEditDialog(false);
    toast({ title: "Client updated" });
    load();
  };

  const handleDelete = async () => {
    try {
      await deleteClient(client.id);
      toast({ title: "Client deleted" });
      navigate("/clients");
    } catch (err: any) {
      toast({ title: "Error deleting client", description: err.message, variant: "destructive" });
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (editingContact) {
      await updateContact(editingContact.id, contactForm);
      toast({ title: "Contact updated" });
    } else {
      await createContact({ ...contactForm, clientId: client.id });
      toast({ title: "Contact added" });
    }
    setContactDialog(false);
    setContactForm({ name: "", title: "", email: "", phone: "", mobilePhone: "", secondaryEmail: "" });
    setEditingContact(null);
    load();
  };

  const handleDeleteContact = async (contactId: string) => {
    await deleteContact(contactId);
    toast({ title: "Contact removed" });
    load();
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({ name: contact.name, title: contact.title || "", email: contact.email || "", phone: contact.phone || "", mobilePhone: contact.mobilePhone || "", secondaryEmail: contact.secondaryEmail || "" });
    setContactDialog(true);
  };

  const openAddContact = () => {
    setEditingContact(null);
    setContactForm({ name: "", title: "", email: "", phone: "", mobilePhone: "", secondaryEmail: "" });
    setContactDialog(true);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{client.companyName}</h1>
          {client.industryType && <p className="text-sm text-muted-foreground">{client.industryType}</p>}
        </div>
        {canEdit && <Button variant="outline" size="sm" onClick={handleEdit}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>}
        {isAdmin && <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Client Info</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            {client.address && <div><span className="text-muted-foreground">Address:</span> <p>{client.address}</p></div>}
            {client.phone && <div><span className="text-muted-foreground">Phone:</span> <p>{client.phone}</p></div>}
            {client.fax && <div><span className="text-muted-foreground">Fax:</span> <p>{client.fax}</p></div>}
            {client.website && <div><span className="text-muted-foreground">Website:</span> <p><a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{client.website}</a></p></div>}
            {client.notes && <div><span className="text-muted-foreground">Notes:</span> <p>{client.notes}</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Contacts</CardTitle>
            {canEdit && <Button size="sm" variant="outline" onClick={openAddContact}><Plus className="h-3 w-3 mr-1" /> Add</Button>}
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
                      {c.secondaryEmail && <p className="text-muted-foreground">{c.secondaryEmail}</p>}
                      {c.phone && <p>{c.phone}</p>}
                      {c.mobilePhone && <p>Mobile: {c.mobilePhone}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditContact(c)}><Pencil className="h-3 w-3 text-muted-foreground" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteContact(c.id)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                    <TableCell><Link to={`/projects/${p.id}`} className="font-mono text-primary hover:underline">{p.projectNumber}</Link></TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
            <DialogDescription>{editingContact ? "Update contact information" : `Add a contact for ${client.companyName}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Title</Label><Input value={contactForm.title} onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Project Manager" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Secondary Email</Label><Input type="email" value={contactForm.secondaryEmail} onChange={e => setContactForm(f => ({ ...f, secondaryEmail: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Mobile Phone</Label><Input value={contactForm.mobilePhone} onChange={e => setContactForm(f => ({ ...f, mobilePhone: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialog(false)}>Cancel</Button>
            <Button onClick={handleAddContact}>{editingContact ? "Save Changes" : "Add Contact"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Fax</Label><Input value={editForm.fax} onChange={e => setEditForm(f => ({ ...f, fax: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} placeholder="e.g. https://example.com" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
