import type { Proposal, ProposalFeeItem, ProposalClauseSelection, AIContentBlock } from "@/types/proposal";
import type { ProposalClause } from "@/types/proposal";
import type { Project, Contact } from "@/types";

interface Props {
  proposal: Partial<Proposal>;
  clientName: string;
  clientAddress: string;
  project?: Project;
  clauses: ProposalClause[];
  contacts: Contact[];
}

export function ProposalPreview({ proposal, clientName, clientAddress, project, clauses, contacts }: Props) {
  const background = (proposal.background as AIContentBlock) || { text: "" };
  const scope = (proposal.scope as AIContentBlock) || { text: "" };
  const feeItems = (proposal.feeItems || []) as ProposalFeeItem[];
  const termsSelections = (proposal.termsSelections || []) as ProposalClauseSelection[];
  const feeTotal = feeItems.reduce((sum, item) => sum + (item.displayAmount || 0), 0);

  const includedClauses = clauses.filter(c =>
    termsSelections.some(s => s.clauseId === c.id && s.included)
  );

  const contact = contacts.find(c => c.id === proposal.proposalDetails?.contactId);
  const projectNumber = project?.projectNumber || "";

  const consultantInfo = {
    name: "Environmental Design Inc.",
    address: "5434 King Avenue, Suite 101\nPennsauken, New Jersey 08109",
  };

  return (
    <div className="max-w-[816px] mx-auto space-y-0">
      {/* Cover Page */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] flex flex-col justify-between" style={{ fontFamily: "Times New Roman, serif" }}>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <img src="/images/edi-logo.jpg" alt="EDI Logo" className="h-24 object-contain" />
          <h1 className="text-xl font-bold tracking-wide">Environmental Services Proposal</h1>
          <p className="text-sm italic">Environmental Design Inc.</p>
          <div className="pt-4">
            <h2 className="text-lg font-bold uppercase">{proposal.serviceType || "[SERVICE TYPE]"}</h2>
            <p className="mt-2">AT</p>
            <p className="font-bold uppercase">{proposal.siteName || "[SITE NAME]"}</p>
            {proposal.buildingArea && <p className="font-bold uppercase">{proposal.buildingArea}</p>}
            <p>{proposal.siteAddress || "[SITE ADDRESS]"}</p>
          </div>
          <div className="pt-4">
            <p>FOR THE CLIENT</p>
            <p className="font-bold uppercase">{clientName || "[CLIENT NAME]"}</p>
            <p>{clientAddress || "[CLIENT ADDRESS]"}</p>
          </div>
          <div className="pt-4">
            <p className="italic">EDI Project # {projectNumber || "[PROJECT #]"}</p>
            <p className="mt-2">{proposal.proposalDate || "[DATE]"}</p>
          </div>
        </div>
        <div className="text-center text-xs mt-8">
          <p className="italic">Environmental Design Inc.</p>
          <p>5434 King Avenue, Suite 101</p>
          <p>Pennsauken, New Jersey 08109</p>
        </div>
      </div>

      {/* Proposal Details Page */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={{ fontFamily: "Times New Roman, serif" }}>
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-lg tracking-widest">EDI</span>
          <div className="text-right text-xs">
            <p>Phone: 1-888-306-4545</p>
            <p>www.editesting.com</p>
          </div>
        </div>
        <hr className="mb-6" />

        <h2 className="text-xl font-bold text-center mb-8">Proposal</h2>

        <p className="mb-6">{proposal.proposalDate || "[DATE]"}</p>

        <div className="space-y-6 text-sm">
          <div>
            <p className="font-semibold">Between the Client:</p>
            <div className="ml-4 mt-1">
              {contact && <p>{contact.name}</p>}
              {contact?.title && <p>{contact.title}</p>}
              <p>{clientName || "[Client Name]"}</p>
              <p className="whitespace-pre-line">{clientAddress || "[Client Address]"}</p>
            </div>
          </div>

          <div>
            <p className="font-semibold">And the Consultant:</p>
            <div className="ml-4 mt-1">
              <p className="italic">{consultantInfo.name}</p>
              <p className="whitespace-pre-line">{consultantInfo.address}</p>
            </div>
          </div>

          <div>
            <p className="font-semibold">For the Project:</p>
            <div className="ml-4 mt-1">
              <p>{proposal.serviceType || "[Service Type]"}</p>
              <p>{proposal.siteName || "[Site Name]"}{proposal.buildingArea ? ` - ${proposal.buildingArea}` : ""}</p>
              <p className="italic">EDI Project # {projectNumber || "[PROJECT #]"}</p>
            </div>
          </div>
        </div>

        {/* Background & Scope */}
        <div className="mt-10">
          <h3 className="text-base font-bold mb-4">Background & Scope of Work</h3>
          {background.text ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{background.text}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">[Background content — edit in Content tab]</p>
          )}
          {scope.text ? (
            <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed">{scope.text}</div>
          ) : (
            <p className="text-sm text-gray-400 italic mt-4">[Scope of Work content — edit in Content tab]</p>
          )}
        </div>
      </div>

      {/* Fee Schedule Page */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={{ fontFamily: "Times New Roman, serif" }}>
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-lg tracking-widest">EDI</span>
        </div>
        <hr className="mb-6" />

        <h3 className="text-base font-bold mb-2">Fee Schedule</h3>
        <div className="text-sm mb-4">
          <p>{proposal.serviceType || "[Service Type]"}</p>
          <p>{proposal.siteName || "[Site Name]"}{proposal.buildingArea ? ` - ${proposal.buildingArea}` : ""}</p>
          <p className="italic">EDI Project # {projectNumber || "[PROJECT #]"}</p>
        </div>

        {feeItems.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 font-bold">Item</th>
                <th className="text-left py-2 font-bold">Description</th>
                <th className="text-center py-2 font-bold">Qty</th>
                <th className="text-right py-2 font-bold">Rate</th>
                <th className="text-right py-2 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {feeItems.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-300 align-top">
                  <td className="py-2 pr-2">{item.displayItem}</td>
                  <td className="py-2 pr-2 whitespace-pre-wrap">{item.displayDescription}</td>
                  <td className="py-2 text-center">{item.displayQty}</td>
                  <td className="py-2 text-right">${item.displayRate.toLocaleString()}</td>
                  <td className="py-2 text-right">${item.displayAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td colSpan={4} className="py-2 text-right font-bold">Total</td>
                <td className="py-2 text-right font-bold">${feeTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-sm text-gray-400 italic">[Fee schedule — add items in Content tab]</p>
        )}
      </div>

      {/* Terms & Conditions Page */}
      {includedClauses.length > 0 && (
        <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={{ fontFamily: "Times New Roman, serif" }}>
          <div className="flex items-center justify-between mb-6">
            <span className="font-bold text-lg tracking-widest">EDI</span>
          </div>
          <hr className="mb-6" />
          <h3 className="text-base font-bold mb-4">Terms and Conditions</h3>
          <div className="space-y-4 text-sm leading-relaxed">
            {includedClauses.map(clause => {
              const sel = termsSelections.find(s => s.clauseId === clause.id);
              const body = sel?.editedBody || clause.body;
              return (
                <p key={clause.id} className="whitespace-pre-wrap">{body}</p>
              );
            })}
          </div>
        </div>
      )}

      {/* Acceptance Page */}
      <div className="bg-white text-black border rounded-lg shadow-sm p-12 min-h-[1056px] mt-4" style={{ fontFamily: "Times New Roman, serif" }}>
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-lg tracking-widest">EDI</span>
        </div>
        <hr className="mb-6" />

        <h3 className="text-base font-bold mb-2">Acceptance of the Proposal</h3>
        <div className="text-sm mb-4">
          <p>{proposal.serviceType || "[Service Type]"}</p>
          <p>{proposal.siteName || "[Site Name]"}{proposal.buildingArea ? ` - ${proposal.buildingArea}` : ""}</p>
          <p className="italic">EDI Project # {projectNumber || "[PROJECT #]"}</p>
        </div>

        <p className="text-sm leading-relaxed mb-8">
          Acceptance of this proposal is to be made only by an individual authorized by the Client to engage Client financially. EDI considers the authorized signature made on this document to be by such an individual.
        </p>
        <p className="text-sm leading-relaxed mb-12">
          Please make note acceptance of this proposal by signing the original and returning it to us. Please make a copy of this proposal for your records. Thank you.
        </p>

        <div className="space-y-12 mt-16">
          {/* Company rep signature */}
          <div>
            <div className="border-b border-black w-80" />
            <p className="text-sm mt-1">{proposal.companyRepName || "[Company Representative]"}</p>
            <p className="text-xs text-gray-600">{proposal.companyRepTitle || "[Title]"}</p>
            <div className="flex justify-between w-80 mt-4">
              <span />
              <div>
                <div className="border-b border-black w-40" />
                <p className="text-xs mt-1">Dated</p>
              </div>
            </div>
          </div>

          {/* Client rep signature */}
          <div>
            <div className="border-b border-black w-80" />
            <p className="text-sm mt-1">Client Authorized Representative</p>
            {proposal.clientSignerName && (
              <p className="text-xs text-gray-600">{proposal.clientSignerName}{proposal.clientSignerTitle ? `, ${proposal.clientSignerTitle}` : ""}</p>
            )}
            <div className="flex justify-between w-80 mt-4">
              <span />
              <div>
                <div className="border-b border-black w-40" />
                <p className="text-xs mt-1">Dated</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
