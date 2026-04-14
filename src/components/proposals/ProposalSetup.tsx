import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Proposal, ProposalFeeItem } from "@/types/proposal";
import type { Client, Project, Contact } from "@/types";
import { EstimateLinker } from "./EstimateLinker";

interface Props {
  proposal: Partial<Proposal>;
  clients: Client[];
  projects: Project[];
  contacts: Contact[];
  onUpdate: (p: Partial<Proposal>) => void;
  onClientChange: (clientId: string) => void;
}

export function ProposalSetup({ proposal, clients, projects, contacts, onUpdate, onClientChange }: Props) {
  const [clientOpen, setClientOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const selectedClient = clients.find(c => c.id === proposal.clientId);
  const selectedProject = projects.find(p => p.id === proposal.projectId);

  // Show all projects — don't filter by client so user can always pick any project
  const filteredProjects = projects;

  const handleEstimateSelect = (estimateId: string, feeItems: ProposalFeeItem[]) => {
    onUpdate({ estimateId, feeItems });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Client</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Client</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                  {selectedClient?.companyName || "Select client..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search clients..." />
                  <CommandList>
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {clients.map(c => (
                        <CommandItem
                          key={c.id}
                          value={c.companyName}
                          onSelect={() => {
                            onClientChange(c.id);
                            setClientOpen(false);
                            onUpdate({
                              clientId: c.id,
                              siteAddress: c.address,
                            });
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", proposal.clientId === c.id ? "opacity-100" : "opacity-0")} />
                          {c.companyName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedClient && (
              <p className="text-sm text-muted-foreground mt-2">{selectedClient.address}</p>
            )}
          </div>

          <div>
            <Label>Contact</Label>
            <Popover open={contactOpen} onOpenChange={setContactOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between mt-1" disabled={!proposal.clientId}>
                  {contacts.find(c => c.id === proposal.proposalDetails?.contactId)?.name || "Select contact..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search contacts..." />
                  <CommandList>
                    <CommandEmpty>No contacts found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {contacts.map(ct => (
                        <CommandItem
                          key={ct.id}
                          value={ct.name}
                          onSelect={() => {
                            onUpdate({
                              proposalDetails: { ...proposal.proposalDetails, contactId: ct.id },
                              clientSignerName: ct.name,
                              clientSignerTitle: "Client Authorized Representative",
                            });
                            setContactOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", proposal.proposalDetails?.contactId === ct.id ? "opacity-100" : "opacity-0")} />
                          <div>
                            <span>{ct.name}</span>
                            {ct.title && <span className="text-muted-foreground ml-2">({ct.title})</span>}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Project & Estimate</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Project</Label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                  {selectedProject ? `${selectedProject.projectNumber} — ${selectedProject.name}` : "Select project..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search projects..." />
                  <CommandList>
                    <CommandEmpty>No projects found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {filteredProjects.map(p => (
                        <CommandItem
                          key={p.id}
                          value={`${p.projectNumber} ${p.name}`}
                          onSelect={() => {
                            onUpdate({
                              projectId: p.id,
                              siteName: p.name,
                              siteAddress: p.location || proposal.siteAddress,
                            });
                            setProjectOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", proposal.projectId === p.id ? "opacity-100" : "opacity-0")} />
                          <div>
                            <span className="font-mono text-xs mr-2">{p.projectNumber}</span>
                            <span>{p.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedProject && (
              <p className="text-sm text-muted-foreground mt-2">{selectedProject.location}</p>
            )}
          </div>

          <EstimateLinker
            projectId={proposal.projectId || null}
            estimateId={proposal.estimateId || null}
            onEstimateSelect={handleEstimateSelect}
          />
        </CardContent>
      </Card>
    </div>
  );
}
