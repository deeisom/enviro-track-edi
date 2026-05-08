import { createClientId } from "@/lib/ids";
import type { InvoiceLineItem, RateItem } from "@/types/invoice";

const text = (value: string | undefined | null) => value?.trim() || "";

export function rateItemToInvoiceLineItem(rateItem?: RateItem): InvoiceLineItem {
  const item = text(rateItem?.item) || text(rateItem?.name);
  const description = text(rateItem?.itemDescription) || text(rateItem?.item) || text(rateItem?.name);
  const rate = Number(rateItem?.defaultRate) || 0;

  return {
    id: createClientId("line"),
    rateItemId: rateItem?.id,
    name: item,
    description,
    qty: 1,
    rate,
    amount: rate,
  };
}
