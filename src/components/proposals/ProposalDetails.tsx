import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Proposal } from "@/types/proposal";
import type { Contact } from "@/types";

interface Props {
  proposal: Partial<Proposal>;
  contacts: Contact[];
  onUpdate: (p: Partial<Proposal>) => void;
}

interface InfoSectionProps {
  proposal: Partial<Proposal>;
  onUpdate: (p: Partial<Proposal>) => void;
  contact?: Contact | null;
  clientName?: string;
  clientAddress?: string;
  projectNumber?: string;
}

function useField(proposal: Partial<Proposal>, onUpdate: (p: Partial<Proposal>) => void) {
  return (label: string, key: keyof Proposal, placeholder = "") => (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        value={(proposal[key] as string) || ""}
        placeholder={placeholder}
        onChange={e => onUpdate({ [key]: e.target.value })}
      />
    </div>
  );
}

const EDI_GREEN = "#4A7C59";

/** Visual mock of the "Between the Client / And the Consultant / For the Project" block. */
function ProposalDetailsPreview({
  proposal,
  contact,
  clientName,
  clientAddress,
  projectNumber,
}: Omit<InfoSectionProps, "onUpdate">) {
  const p = proposal;
  const clientLines: string[] = [];
  if (contact) {
    clientLines.push(contact.name);
    if (contact.title) clientLines.push(contact.title);
  }
  if (clientName) clientLines.push(clientName);
  if (clientAddress) clientLines.push(...clientAddress.split("\n").filter(Boolean));
  if (clientLines.length === 0) clientLines.push("[Client info from Setup tab]");

  const projectTitle = p.serviceType || "[Work Performed Title]";
  const siteLine = `${p.siteName || "[Site Name]"}${p.buildingArea ? ` - ${p.buildingArea}` : ""}`;
  const projNum = projectNumber || "[Project #]";

  const labelCol = "w-44 shrink-0 text-foreground";
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-4">
      <div className={labelCol}>{label}</div>
      <div className="flex-1 space-y-0.5">{children}</div>
    </div>
  );

  return (
    <div
      className="rounded-md border bg-white text-black p-6 space-y-5"
      style={{ fontFamily: "Times New Roman, serif" }}
    >
      <div className="space-y-3">
        <div className="text-2xl font-bold">Proposal</div>
        <div className="text-sm">{p.proposalDate || "[Proposal Date]"}</div>
      </div>

      <Row label="Between the Client:">
        {clientLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </Row>

      <Row label="And the Consultant:">
        <div>
          <span style={{ fontFamily: "'Final Frontier', serif", fontStyle: "italic", color: EDI_GREEN }}>
            Environmental Design Inc.
          </span>
        </div>
        <div>5434 King Avenue, Suite 101</div>
        <div>Pennsauken, New Jersey 08109</div>
      </Row>

      <Row label="For the Project:">
        <div>{projectTitle}</div>
        <div>{siteLine}</div>
        <div>
          <span style={{ fontFamily: "'Final Frontier', serif", fontStyle: "italic", color: EDI_GREEN }}>
            EDI
          </span>{" "}
          Project # {projNum}
        </div>
      </Row>
    </div>
  );
}

/** Proposal info — used on the Proposal tab */
export function ProposalInfoSection({
  proposal,
  onUpdate,
  contact,
  clientName,
  clientAddress,
  projectNumber,
}: InfoSectionProps) {
  const field = useField(proposal, onUpdate);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Proposal Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("Proposal Date", "proposalDate", "MM/DD/YYYY")}
          <p className="text-xs text-muted-foreground">
            Other details below are pulled from the Setup &amp; Cover Page tabs.
            Edit them there to update this preview.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
        <CardContent>
          <ProposalDetailsPreview
            proposal={proposal}
            contact={contact}
            clientName={clientName}
            clientAddress={clientAddress}
            projectNumber={projectNumber}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** Company rep + client signer — used on the Setup tab */
export function SignersSection({ proposal, onUpdate }: Omit<Props, "contacts">) {
  const field = useField(proposal, onUpdate);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Company Representative</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("Representative Name", "companyRepName", "e.g. Tim Gromen")}
          {field("Representative Title", "companyRepTitle", "e.g. Director, Industrial Hygiene & Safety")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Client Acceptance Signer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("Signer Name", "clientSignerName")}
          <div>
            <Label>Signer Title</Label>
            <Input
              className="mt-1"
              value="Client Authorized Representative"
              disabled
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Backwards-compatible combined view (all four cards) */
export function ProposalDetails({ proposal, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <ProposalInfoSection proposal={proposal} onUpdate={onUpdate} />
      <SignersSection proposal={proposal} onUpdate={onUpdate} />
    </div>
  );
}
