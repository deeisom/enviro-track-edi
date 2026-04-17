import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { Proposal } from "@/types/proposal";

interface Props {
  proposal: Partial<Proposal>;
  clientName: string;
  clientAddress: string;
  projectNumber: string;
  onUpdate: (partial: Partial<Proposal>) => void;
}

const EDI_GREEN = "#4A7C59";

/** Split a free-form address into a street line and a city/state/zip line.
 *  Honors explicit newlines; otherwise splits on the last comma before a state/zip. */
function splitAddress(addr: string): { line1: string; line2: string } {
  if (!addr) return { line1: "", line2: "" };
  const lines = addr.split("\n").map(s => s.trim()).filter(Boolean);
  if (lines.length >= 2) return { line1: lines[0], line2: lines.slice(1).join(", ") };
  // Try to split single-line "123 Main St, City, ST 12345"
  const single = lines[0] || "";
  const match = single.match(/^(.*?),\s*(.+\s+[A-Z]{2}\s*\d{0,5}.*)$/);
  if (match) return { line1: match[1].trim(), line2: match[2].trim() };
  return { line1: single, line2: "" };
}

/** Compute effective cover-page field values: override (when set) else auto. */
export function getEffectiveCoverFields(
  proposal: Partial<Proposal>,
  autoClientName: string,
  autoClientAddress: string,
  autoProjectNumber: string,
) {
  const cp = (proposal.coverPage || {}) as Record<string, any>;
  const auto = splitAddress(autoClientAddress);
  const clientName = cp.clientNameOverride ?? autoClientName;
  const clientAddressLine1 = cp.clientAddressLine1 ?? auto.line1;
  const clientAddressLine2 = cp.clientAddressLine2 ?? auto.line2;
  const projectNumber = cp.projectNumberOverride ?? autoProjectNumber;
  const clientAddress = [clientAddressLine1, clientAddressLine2].filter(Boolean).join("\n");
  return { clientName, clientAddress, clientAddressLine1, clientAddressLine2, projectNumber };
}

export function CoverPagePreview({
  proposal,
  clientName,
  clientAddress,
  projectNumber,
}: Omit<Props, "onUpdate">) {
  const pageStyle = { fontFamily: "Times New Roman, serif" };
  const brandFont = { fontFamily: "'Final Frontier', serif" };

  const clientAddressLines = (clientAddress || "").split("\n").filter(Boolean);

  return (
    <div
      className="bg-white text-black border-2 border-black shadow-sm mx-auto flex flex-col"
      style={{
        ...pageStyle,
        width: "612px",
        height: "792px",
        padding: "48px 64px",
        overflow: "hidden",
      }}
    >
      {/* Header - left aligned */}
      <div className="mb-1">
        <p className="font-bold leading-tight" style={{ fontSize: "22px" }}>
          Environmental Services Proposal
        </p>
        <p
          className="leading-tight"
          style={{ ...brandFont, color: EDI_GREEN, fontSize: "14px", fontStyle: "italic" }}
        >
          Environmental Design Inc.
        </p>
      </div>

      {/* Center content area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center -mt-8">
        {/* Work Performed Title */}
        <h2
          className="font-bold mb-2 tracking-wide"
          style={{ fontSize: "28px", fontVariant: "small-caps" }}
        >
          {proposal.serviceType || "[WORK PERFORMED TITLE]"}
        </h2>
        {/* Optional Secondary Title */}
        {proposal.secondaryServiceType && (
          <p
            className="mb-2"
            style={{ fontSize: "20px", fontVariant: "small-caps" }}
          >
            {proposal.secondaryServiceType}
          </p>
        )}

        <p className="my-3" style={{ fontSize: "20px" }}>AT</p>

        {/* Location Name */}
        <p
          className="font-bold"
          style={{ fontSize: "22px", fontVariant: "small-caps" }}
        >
          {proposal.siteName || "[LOCATION NAME]"}
        </p>
        {/* Optional Secondary Location */}
        {proposal.buildingArea && (
          <p
            className="font-bold"
            style={{ fontSize: "22px", fontVariant: "small-caps" }}
          >
            {proposal.buildingArea}
          </p>
        )}
        {/* Address */}
        <p style={{ fontSize: "20px", fontVariant: "small-caps" }}>
          {proposal.siteAddress || "[STREET ADDRESS]"}
        </p>
        {proposal.siteAddressLine2 && (
          <p style={{ fontSize: "20px", fontVariant: "small-caps" }}>
            {proposal.siteAddressLine2}
          </p>
        )}

        {/* Client section */}
        <div className="mt-8">
          <p style={{ fontSize: "20px", fontVariant: "small-caps" }}>
            For the Client
          </p>
          <p
            className="font-bold"
            style={{ fontSize: "20px", fontVariant: "small-caps" }}
          >
            {clientName || "[CLIENT NAME]"}
          </p>
          {clientAddressLines.map((line, i) => (
            <p key={i} style={{ fontSize: "20px", fontVariant: "small-caps" }}>
              {line}
            </p>
          ))}
          {clientAddressLines.length === 0 && (
            <p style={{ fontSize: "20px", fontVariant: "small-caps" }}>
              [CLIENT ADDRESS]
            </p>
          )}
        </div>

        {/* Project # */}
        <div className="mt-8">
          <p style={{ fontSize: "16px" }}>
            <span style={{ ...brandFont, fontStyle: "italic" }}>EDI </span>
            Project # {projectNumber || "[PROJECT #]"}
          </p>
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex items-end justify-between mt-2">
        <div>
          <p className="mb-12" style={{ fontSize: "16px" }}>
            {proposal.proposalDate || "[DATE]"}
          </p>
          <p style={{ ...brandFont, color: EDI_GREEN, fontSize: "16px" }}>
            Environmental Design Inc.
          </p>
          <p style={{ fontSize: "12px" }}>5434 King Avenue, Suite 101</p>
          <p style={{ fontSize: "12px" }}>Pennsauken, New Jersey 08109</p>
          <p style={{ fontSize: "12px" }}>Phone: 1-888-306-4545</p>
          <p style={{ fontSize: "12px" }}>www.editesting.com</p>
        </div>
        <img
          src="/images/edi-globe-logo.png"
          alt="EDI Globe Logo"
          className="object-contain"
          style={{ width: "100px", height: "116px" }}
        />
      </div>
    </div>
  );
}

export function CoverPageStep({ proposal, clientName, clientAddress, projectNumber, onUpdate }: Props) {
  const cp = (proposal.coverPage || {}) as Record<string, any>;
  const effective = getEffectiveCoverFields(proposal, clientName, clientAddress, projectNumber);

  const updateCover = (patch: Record<string, any>) => {
    onUpdate({ coverPage: { ...cp, ...patch } });
  };

  const resetField = (key: string) => {
    const next = { ...cp };
    delete next[key];
    onUpdate({ coverPage: next });
  };

  const isOverridden = (key: string) => cp[key] !== undefined && cp[key] !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Cover Page Details</h3>

        <div className="space-y-2">
          <Label htmlFor="serviceType">Work Performed Title *</Label>
          <Input
            id="serviceType"
            value={proposal.serviceType || ""}
            onChange={e => onUpdate({ serviceType: e.target.value })}
            placeholder="e.g. Targeted Mold Evaluation"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryServiceType">Secondary Work Performed Title (optional)</Label>
          <Input
            id="secondaryServiceType"
            value={proposal.secondaryServiceType || ""}
            onChange={e => onUpdate({ secondaryServiceType: e.target.value })}
            placeholder="e.g. Secondary Title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siteName">Location Name *</Label>
          <Input
            id="siteName"
            value={proposal.siteName || ""}
            onChange={e => onUpdate({ siteName: e.target.value })}
            placeholder="e.g. Wesley D. Tisdale Elementary School"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="buildingArea">Secondary Location (optional)</Label>
          <Input
            id="buildingArea"
            value={proposal.buildingArea || ""}
            onChange={e => onUpdate({ buildingArea: e.target.value })}
            placeholder="e.g. Room 1A & Room 2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siteAddress">Work Performed Address (Street)</Label>
          <Input
            id="siteAddress"
            value={proposal.siteAddress || ""}
            onChange={e => onUpdate({ siteAddress: e.target.value })}
            placeholder="e.g. 200 Island Avenue"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siteAddressLine2">Work Performed Address (City, State, Zip)</Label>
          <Input
            id="siteAddressLine2"
            value={proposal.siteAddressLine2 || ""}
            onChange={e => onUpdate({ siteAddressLine2: e.target.value })}
            placeholder="e.g. Ramsey, NJ 07446"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proposalDate">Proposal Date</Label>
          <Input
            id="proposalDate"
            value={proposal.proposalDate || ""}
            onChange={e => onUpdate({ proposalDate: e.target.value })}
            placeholder="e.g. November 20, 2025"
          />
        </div>

        {/* Editable client + project (auto-populated from Setup, overridable here) */}
        <div className="border-t pt-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">
              Client &amp; Project (auto-populated from Setup — editable)
            </h4>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clientNameOverride">Client Name</Label>
              {isOverridden("clientNameOverride") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => resetField("clientNameOverride")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset to auto
                </Button>
              )}
            </div>
            <Input
              id="clientNameOverride"
              value={effective.clientName}
              onChange={e => updateCover({ clientNameOverride: e.target.value })}
              placeholder="Client name"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clientAddressLine1">Client Address (Street)</Label>
              {isOverridden("clientAddressLine1") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => resetField("clientAddressLine1")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset to auto
                </Button>
              )}
            </div>
            <Input
              id="clientAddressLine1"
              value={effective.clientAddressLine1}
              onChange={e => updateCover({ clientAddressLine1: e.target.value })}
              placeholder="e.g. 123 Example Lane"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clientAddressLine2">Client Address (City, State, Zip)</Label>
              {isOverridden("clientAddressLine2") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => resetField("clientAddressLine2")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset to auto
                </Button>
              )}
            </div>
            <Input
              id="clientAddressLine2"
              value={effective.clientAddressLine2}
              onChange={e => updateCover({ clientAddressLine2: e.target.value })}
              placeholder="e.g. Example City, NJ 08110"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="projectNumberOverride">Project Number</Label>
              {isOverridden("projectNumberOverride") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => resetField("projectNumberOverride")}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset to auto
                </Button>
              )}
            </div>
            <Input
              id="projectNumberOverride"
              value={effective.projectNumber}
              onChange={e => updateCover({ projectNumberOverride: e.target.value })}
              placeholder="e.g. EDI-2026-0001"
            />
          </div>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="overflow-auto">
        <h3 className="text-lg font-semibold mb-3">Cover Page Preview</h3>
        <div className="transform origin-top-left scale-[0.75]">
          <CoverPagePreview
            proposal={proposal}
            clientName={effective.clientName}
            clientAddress={effective.clientAddress}
            projectNumber={effective.projectNumber}
          />
        </div>
      </div>
    </div>
  );
}
