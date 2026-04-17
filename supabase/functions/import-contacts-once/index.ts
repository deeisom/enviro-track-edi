// One-shot importer: server-side dedup via RPC, then diff-and-insert.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Rec = {
  company: string; name: string; email: string;
  phone: string; mobile: string; email2: string;
};

const norm = (s: string) => (s ?? "").toString().trim().toLowerCase();

async function readAll<T>(supa: any, table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa.from(table).select(cols).range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(url, srk, { auth: { persistSession: false } });
  const report: Record<string, unknown> = {};

  try {
    // 1. Server-side dedup (single SQL pass each)
    const { data: dc, error: dcErr } = await supa.rpc("_dedup_clients_once");
    if (dcErr) throw dcErr;
    report.client_dedup = dc?.[0] ?? dc;

    const { data: dk, error: dkErr } = await supa.rpc("_dedup_contacts_once");
    if (dkErr) throw dkErr;
    report.contact_dedup = dk?.[0] ?? dk;

    // 2. Load source data
    const { data: blob, error: dlErr } = await supa.storage
      .from("import-staging").download("contacts.json");
    if (dlErr) throw dlErr;
    const records: Rec[] = JSON.parse(await blob.text());
    report.spreadsheet_rows = records.length;

    // 3. Load canonical clients
    const clients = await readAll<{ id: string; company_name: string }>(
      supa, "clients", "id,company_name"
    );
    report.clients_after_dedup = clients.length;
    const clientByName = new Map<string, string>();
    for (const c of clients) clientByName.set(norm(c.company_name), c.id);

    // 4. Auto-create missing companies
    const firstSeen = new Map<string, string>();
    for (const r of records) {
      const k = norm(r.company);
      if (!k || clientByName.has(k) || firstSeen.has(k)) continue;
      firstSeen.set(k, r.company.trim());
    }
    const missingCompanies = Array.from(firstSeen.entries()).map(([, v]) => v);
    report.missing_companies_to_create = missingCompanies.length;

    let createdClients = 0;
    for (let i = 0; i < missingCompanies.length; i += 200) {
      const batch = missingCompanies.slice(i, i + 200).map((n) => ({ company_name: n }));
      const { data, error } = await supa.from("clients").insert(batch).select("id,company_name");
      if (error) throw error;
      for (const c of data ?? []) clientByName.set(norm(c.company_name), c.id);
      createdClients += data?.length ?? 0;
    }
    report.clients_created = createdClients;

    // 5. Build set of existing (client_id, lower(name), lower(email)) triples
    const contacts = await readAll<{ client_id: string; name: string; email: string }>(
      supa, "contacts", "client_id,name,email"
    );
    report.contacts_after_dedup = contacts.length;
    const existing = new Set<string>();
    for (const c of contacts) existing.add(`${c.client_id}|${norm(c.name)}|${norm(c.email)}`);

    // 6. Diff and insert
    const toInsert: any[] = [];
    let skippedNoClient = 0;
    let skippedDup = 0;
    for (const r of records) {
      const k = norm(r.company);
      const cid = clientByName.get(k);
      if (!cid) { skippedNoClient++; continue; }
      const key = `${cid}|${norm(r.name)}|${norm(r.email)}`;
      if (existing.has(key)) { skippedDup++; continue; }
      existing.add(key);
      toInsert.push({
        client_id: cid,
        name: r.name.trim(),
        email: r.email.trim(),
        phone: r.phone.trim(),
        mobile_phone: r.mobile.trim(),
        secondary_email: r.email2.trim(),
      });
    }
    report.skipped_no_client = skippedNoClient;
    report.skipped_already_present = skippedDup;
    report.to_insert = toInsert.length;

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500);
      const { error } = await supa.from("contacts").insert(batch);
      if (error) { report.insert_error = error.message; break; }
      inserted += batch.length;
    }
    report.inserted = inserted;

    const { count: fc } = await supa.from("contacts").select("*", { count: "exact", head: true });
    const { count: fcl } = await supa.from("clients").select("*", { count: "exact", head: true });
    report.final_contacts = fc;
    report.final_clients = fcl;

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    report.error = String(e?.message ?? e);
    return new Response(JSON.stringify(report, null, 2), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
