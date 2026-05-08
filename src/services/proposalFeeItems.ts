import type { InvoiceLineItem } from "@/types/invoice";
import type { ProposalFeeItem } from "@/types/proposal";
import { createClientId } from "@/lib/ids";

export function invoiceLineItemsToProposalFeeItems(lineItems: InvoiceLineItem[]): ProposalFeeItem[] {
  return lineItems
    .map((item) => {
      const legacyItem = item as InvoiceLineItem & {
        item?: string;
        displayItem?: string;
        displayDescription?: string;
        displayQty?: number;
        displayRate?: number;
        displayAmount?: number;
      };
      const name = String(legacyItem.name ?? legacyItem.item ?? legacyItem.displayItem ?? "").trim();
      const description = String(legacyItem.description ?? legacyItem.displayDescription ?? "").trim();
      const qty = Number(legacyItem.qty ?? legacyItem.displayQty) || 0;
      const rate = Number(legacyItem.rate ?? legacyItem.displayRate) || 0;
      const amount = Number(legacyItem.amount ?? legacyItem.displayAmount) || qty * rate;

      return { name, description, qty, rate, amount };
    })
    .filter((item) => item.name || item.description)
    .map((item, index) => {
      return {
        id: createClientId("fee"),
        sourceEstimateItem: item.name,
        sourceDescription: item.description,
        sourceQty: item.qty,
        sourceRate: item.rate,
        sourceAmount: item.amount,
        displayItem: item.name,
        displayDescription: item.description,
        displayQty: item.qty,
        displayRate: item.rate,
        displayAmount: item.amount,
        sortOrder: index,
        isOptional: false,
        manualOverride: false,
      };
    });
}
