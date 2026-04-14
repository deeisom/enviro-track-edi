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

export function ProposalDetails({ proposal, contacts, onUpdate }: Props) {
  const field = (label: string, key: keyof Proposal, placeholder = "") => (
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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Proposal Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("Proposal Date", "proposalDate", "MM/DD/YYYY")}
          {field("Expiration Date", "expirationDate", "MM/DD/YYYY")}
          {field("Service Type", "serviceType", "e.g. Targeted Mold Evaluation")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Site / Facility</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field("Site / Facility Name", "siteName", "e.g. Wesley D. Tisdale Elementary School")}
          {field("Site Address", "siteAddress")}
          {field("Building / Room / Area", "buildingArea", "e.g. Room 1A & Room 2")}
        </CardContent>
      </Card>

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
          {field("Signer Title", "clientSignerTitle")}
        </CardContent>
      </Card>
    </div>
  );
}
