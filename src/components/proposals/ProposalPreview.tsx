import type { Proposal, ProposalFeeItem, ProposalClauseSelection, AIContentBlock } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";
import type { Project, Contact } from "@/types";
import { CoverPagePreview } from "./CoverPageStep";

interface Props {
  proposal: Partial<Proposal>;
  clientName: string;
  clientAddress: string;
  project?: Project;
  clauses: ProposalClause[];
  contacts: Contact[];
}

/** Replace [variableName] with values, unfilled -> [___] */
function substituteVariables(body: string, variables: Record<string, string> = {}): string {
  return body.replace(/\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g, (match, name) => {
    return variables[name] || "[___]";
  });
}

const EDI_GREEN = "#4A7C59";
const TABLE_GREEN = "#C5E0B4";

function EdiHeader({ showContact = false }: { showContact?: boolean }) {
  return (
    <div className="mb-6">
      <p className="text-right text-2xl italic font-bold" style={{ color: EDI_GREEN }}>EDI</p>
      <hr className="border-t border-gray-400 mt-1 mb-2" />
      {showContact && (
        <div className="text-xs">
          <p>Phone: 1-888-306-4545</p>
          <p>www.editesting.com</p>
        </div>
      )}
    </div>
  );
}

export function ProposalPreview({ proposal, clientName, clientAddress, project, clauses, contacts }: Props) {
  const background = (proposal.background as AIContentBlock) || { text: "" };
  const scope = (proposal.scope as AIContentBlock) || { text: "" };
  const feeItems = (proposal.feeItems || []) as ProposalFeeItem[];
  const termsSelections = (proposal.termsSelections || []) as ProposalClauseSelection[];
  const feeTotal = feeItems.reduce((sum, item) => sum + (item.displayAmount || 0), 0);

  const contact = contacts.find(c => c.id === proposal.proposalDetails?.contactId);
  const projectNumber = project?.projectNumber || "";

  // Build terms items as a flat list.
  const includedClauses = clauses.filter(c =>
    termsSelections.some(s => s.clauseId === c.id && s.included)
  );
  const customInline = termsSelections.filter(s => s.isCustom && s.included && s.customTitle);

  const allTermsBodies: string[] = [];
  includedClauses.forEach(clause => {
    const sel = termsSelections.find(s => s.clauseId === clause.id);
    const body = sel?.editedBody || clause.body;
    allTermsBodies.push(substituteVariables(body, sel?.variables));
  });
  customInline.forEach(s => {
    allTermsBodies.push(s.customBody || "");
  });

  const pageStyle = { fontFamily: "Times New Roman, serif" };

  return (
    <div className="max-w-[816px] mx-auto space-y-0">
      {/* ===== Cover Page ===== */}
      <CoverPagePreview
        proposal={proposal}
        clientName={clientName}
        clientAddress={clientAddress}
        projectNumber={projectNumber}
      />

      {/* ===== Blank Page 2 (EDI header only) ===== */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={pageStyle}>
        <EdiHeader showContact />
      </div>

      {/* ===== Proposal Details Page ===== */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={pageStyle}>
        <EdiHeader />
        <h2 className="text-xl font-bold mb-4">Proposal</h2>
        <p className="text-sm mb-6">{proposal.proposalDate || "[DATE]"}</p>

        {/* Two-column tabbed layout */}
        <div className="text-sm space-y-6" style={{ textAlign: "justify" }}>
          <div className="flex">
            <span className="w-40 flex-shrink-0">Between the Client:</span>
            <div>
              {contact && <p>{contact.name}</p>}
              {contact?.title && <p>{contact.title}</p>}
              <p>{clientName || "[Client Name]"}</p>
              <p className="whitespace-pre-line">{clientAddress || "[Client Address]"}</p>
            </div>
          </div>
          <div className="flex">
            <span className="w-40 flex-shrink-0">And the Consultant:</span>
            <div>
              <p className="italic">Environmental Design Inc.</p>
              <p>5434 King Avenue, Suite 101</p>
              <p>Pennsauken, New Jersey 08109</p>
            </div>
          </div>
          <div className="flex">
            <span className="w-40 flex-shrink-0">For the Project:</span>
            <div>
              <p>{proposal.serviceType || "[Service Type]"}</p>
              <p>{proposal.siteName || "[Site Name]"}{proposal.buildingArea ? ` - ${proposal.buildingArea}` : ""}</p>
              <p className="italic">EDI Project # {projectNumber || "[PROJECT #]"}</p>
            </div>
          </div>
        </div>

        <div className="mt-10" style={{ textAlign: "justify" }}>
          <h3 className="text-base font-bold mb-4">Background & Scope of Work</h3>
          {background.text ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{background.text}</p>
          ) : (
              <p className="text-sm text-gray-400 italic">[Background content - edit in Content tab]</p>
          )}
          {scope.text ? (
            <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed">{scope.text}</div>
          ) : (
              <p className="text-sm text-gray-400 italic mt-4">[Scope of Work content - edit in Content tab]</p>
          )}
        </div>
      </div>

      {/* ===== Fee Schedule Page ===== */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={pageStyle}>
        <EdiHeader />
        <h3 className="text-base font-bold mb-2">Fee Schedule</h3>
        <div className="text-sm mb-4">
          <p>{proposal.serviceType || "[Service Type]"}</p>
          <p>{proposal.siteName || "[Site Name]"}{proposal.buildingArea ? ` - ${proposal.buildingArea}` : ""}</p>
          <p className="italic">EDI Project # {projectNumber || "[PROJECT #]"}</p>
        </div>
        {feeItems.length > 0 ? (
          <table className="w-full text-sm border-collapse" style={{ textAlign: "justify" }}>
            <thead>
              <tr>
                <th className="text-left py-2 px-2 font-bold border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}>Item</th>
                <th className="text-left py-2 px-2 font-bold border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}>Description</th>
                <th className="text-center py-2 px-2 font-bold border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}>Qty</th>
                <th className="text-right py-2 px-2 font-bold border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}>Rate</th>
                <th className="text-right py-2 px-2 font-bold border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {feeItems.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="py-2 px-2 border border-gray-300">{item.displayItem}</td>
                  <td className="py-2 px-2 border border-gray-300 whitespace-pre-wrap">{item.displayDescription}</td>
                  <td className="py-2 px-2 text-center border border-gray-300">{item.displayQty}</td>
                  <td className="py-2 px-2 text-right border border-gray-300">${item.displayRate.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right border border-gray-300">${item.displayAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}></td>
                <td className="py-2 px-2 text-right font-bold border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}>Total</td>
                <td className="py-2 px-2 text-right font-bold border border-gray-300" style={{ backgroundColor: TABLE_GREEN }}>${feeTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
              <p className="text-sm text-gray-400 italic">[Fee schedule - add items in Content tab]</p>
        )}
      </div>

      {/* ===== Terms & Conditions Page ===== */}
      {allTermsBodies.length > 0 && (
        <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={pageStyle}>
          <EdiHeader />
          <h3 className="text-base font-bold mb-4">Terms and Condition</h3>
          <div className="text-sm leading-relaxed space-y-4" style={{ textAlign: "justify" }}>
            {allTermsBodies.map((body, idx) => (
              <p key={idx} className="whitespace-pre-wrap">{body}</p>
            ))}
          </div>
        </div>
      )}

      {/* ===== Acceptance Page ===== */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={pageStyle}>
        <EdiHeader />
        <h3 className="text-base font-bold mb-2">Acceptance of the Proposal</h3>
        <div className="text-sm mb-4">
          <p>{proposal.serviceType || "[Service Type]"}</p>
          <p>{proposal.siteName || "[Site Name]"}{proposal.buildingArea ? ` - ${proposal.buildingArea}` : ""}</p>
          <p className="italic">EDI Project # {projectNumber || "[PROJECT #]"}</p>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ textAlign: "justify" }}>
          Acceptance of this proposal is to be made only by an individual authorized by the Client to engage Client financially. EDI considers the authorized signature made on this document to be by such an individual.
        </p>
        <p className="text-sm leading-relaxed mb-12" style={{ textAlign: "justify" }}>
          Please make note acceptance of this proposal by signing the original and returning it to us. Please make a copy of this proposal for your records. Thank you.
        </p>

        {/* Signature blocks - horizontal layout */}
        <div className="space-y-10 mt-8">
          {/* Company rep */}
          <div>
            <div className="flex items-end gap-16">
              <div className="flex-1">
                <div className="border-b border-black" />
              </div>
              <div className="w-40">
                <div className="border-b border-black" />
              </div>
            </div>
            <div className="flex gap-16">
              <div className="flex-1">
                <p className="text-sm mt-1">{proposal.companyRepName || "[Company Representative]"}</p>
                <p className="text-xs text-gray-600">{proposal.companyRepTitle || "[Title]"}</p>
              </div>
              <div className="w-40">
                <p className="text-xs mt-1">Dated</p>
              </div>
            </div>
          </div>

          {/* Client rep */}
          <div>
            <div className="flex items-end gap-16">
              <div className="flex-1">
                <div className="border-b border-black" />
              </div>
              <div className="w-40">
                <div className="border-b border-black" />
              </div>
            </div>
            <div className="flex gap-16">
              <div className="flex-1">
                <p className="text-sm mt-1">Client Authorized Representative</p>
                {proposal.clientSignerName && (
                  <p className="text-xs text-gray-600">{proposal.clientSignerName}{proposal.clientSignerTitle ? `, ${proposal.clientSignerTitle}` : ""}</p>
                )}
              </div>
              <div className="w-40">
                <p className="text-xs mt-1">Dated</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
