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

/** Proposal info + Work location — used on the Proposal tab */
export function ProposalInfoSection({ proposal, onUpdate }: Omit<Props, "contacts">) {
  const field = useField(proposal, onUpdate);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Proposal Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("Proposal Date", "proposalDate", "MM/DD/YYYY")}
          {field("Expiration Date", "expirationDate", "MM/DD/YYYY")}
          {field("Work Performed Title", "serviceType", "e.g. Targeted Mold Evaluation")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Work Location</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("Location Name", "siteName", "e.g. Wesley D. Tisdale Elementary School")}
          {field("Work Performed Address", "siteAddress")}
          {field("Secondary Location", "buildingArea", "e.g. Room 1A & Room 2")}
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
