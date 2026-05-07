import type { InvoiceLineItem } from "@/types/invoice";
import type { ProposalFeeItem } from "@/types/proposal";

export function invoiceLineItemsToProposalFeeItems(lineItems: InvoiceLineItem[]): ProposalFeeItem[] {
  return lineItems
    .filter((item) => item.name.trim() || item.description.trim())
    .map((item, index) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const amount = Number(item.amount) || qty * rate;

      return {
        id: crypto.randomUUID(),
        sourceEstimateItem: item.name,
        sourceDescription: item.description,
        sourceQty: qty,
        sourceRate: rate,
        sourceAmount: amount,
        displayItem: item.name.trim(),
        displayDescription: item.description.trim(),
        displayQty: qty,
        displayRate: rate,
        displayAmount: amount,
        sortOrder: index,
        isOptional: false,
        manualOverride: false,
      };
    });
}
