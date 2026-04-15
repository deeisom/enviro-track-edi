import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Proposal } from "@/types/proposal";

interface Props {
  proposal: Partial<Proposal>;
  clientName: string;
  clientAddress: string;
  projectNumber: string;
  onUpdate: (partial: Partial<Proposal>) => void;
}

const EDI_GREEN = "#4A7C59";

export function CoverPagePreview({
  proposal,
  clientName,
  clientAddress,
  projectNumber,
}: Omit<Props, "onUpdate">) {
  const pageStyle = { fontFamily: "Times New Roman, serif" };

  // Split client address into lines
  const clientAddressLines = (clientAddress || "").split("\n").filter(Boolean);

  return (
    <div
      className="bg-white text-black border-2 border-black shadow-sm mx-auto flex flex-col"
      style={{
        ...pageStyle,
        width: "612px",
        minHeight: "792px",
        padding: "48px 64px",
      }}
    >
      {/* Header - left aligned */}
      <div className="mb-1">
        <p className="text-2xl font-bold leading-tight">Environmental Services Proposal</p>
        <p className="text-sm italic leading-tight" style={{ color: EDI_GREEN }}>
          Environmental Design Inc.
        </p>
      </div>
      <hr className="border-t border-black mb-6" />

      {/* Center content area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center -mt-8">
        {/* Work Performed Title */}
        <h2
          className="text-2xl font-bold underline mb-2 tracking-wide"
          style={{ fontVariant: "small-caps" }}
        >
          {proposal.serviceType || "[WORK PERFORMED TITLE]"}
        </h2>
        {/* Optional Secondary Title */}
        {proposal.secondaryServiceType && (
          <p
            className="text-base mb-2"
            style={{ fontVariant: "small-caps" }}
          >
            {proposal.secondaryServiceType}
          </p>
        )}

        <p className="text-sm my-3">AT</p>

        {/* Location Name */}
        <p
          className="text-xl font-bold"
          style={{ fontVariant: "small-caps" }}
        >
          {proposal.siteName || "[LOCATION NAME]"}
        </p>
        {/* Optional Secondary Location */}
        {proposal.buildingArea && (
          <p
            className="text-lg font-bold"
            style={{ fontVariant: "small-caps" }}
          >
            {proposal.buildingArea}
          </p>
        )}
        {/* Address */}
        <p className="text-base" style={{ fontVariant: "small-caps" }}>
          {proposal.siteAddress || "[STREET ADDRESS]"}
        </p>
        {proposal.siteAddressLine2 && (
          <p className="text-base" style={{ fontVariant: "small-caps" }}>
            {proposal.siteAddressLine2}
          </p>
        )}

        {/* Client section */}
        <div className="mt-8">
          <p className="text-base" style={{ fontVariant: "small-caps" }}>
            For the Client
          </p>
          <p
            className="text-lg font-bold"
            style={{ fontVariant: "small-caps" }}
          >
            {clientName || "[CLIENT NAME]"}
          </p>
          {clientAddressLines.map((line, i) => (
            <p key={i} className="text-base" style={{ fontVariant: "small-caps" }}>
              {line}
            </p>
          ))}
          {!clientAddress && (
            <p className="text-base" style={{ fontVariant: "small-caps" }}>
              [CLIENT ADDRESS]
            </p>
          )}
        </div>

        {/* Project # */}
        <div className="mt-8">
          <p className="text-sm italic">
            <span className="italic">EDI</span> Project # {projectNumber || "[PROJECT #]"}
          </p>
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex items-end justify-between mt-4">
        <div>
          <p className="text-sm mb-3">{proposal.proposalDate || "[DATE]"}</p>
          <p className="text-sm italic" style={{ color: EDI_GREEN }}>
            Environmental Design Inc.
          </p>
          <p className="text-xs">5434 King Avenue, Suite 101</p>
          <p className="text-xs">Pennsauken, New Jersey 08109</p>
        </div>
        <img
          src="/images/edi-globe-logo.jpg"
          alt="EDI Globe Logo"
          className="object-contain"
          style={{ height: "140px" }}
        />
      </div>
    </div>
  );
}

export function CoverPageStep({ proposal, clientName, clientAddress, projectNumber, onUpdate }: Props) {
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

        {/* Read-only fields */}
        <div className="border-t pt-4 mt-4 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Auto-populated from Setup</h4>
          <div>
            <Label className="text-muted-foreground">Client Name</Label>
            <p className="text-sm">{clientName || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Client Address</Label>
            <p className="text-sm whitespace-pre-line">{clientAddress || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Project Number</Label>
            <p className="text-sm">{projectNumber || "—"}</p>
          </div>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="overflow-auto">
        <h3 className="text-lg font-semibold mb-3">Cover Page Preview</h3>
        <div className="transform origin-top-left scale-[0.75]">
          <CoverPagePreview
            proposal={proposal}
            clientName={clientName}
            clientAddress={clientAddress}
            projectNumber={projectNumber}
          />
        </div>
      </div>
    </div>
  );
}
