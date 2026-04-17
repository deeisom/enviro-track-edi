// One-shot importer: cleans up duplicate clients & contacts produced by prior
// imports, then inserts only the missing rows from the uploaded spreadsheet
// (stored at import-staging/contacts.json). Returns a JSON report.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Rec = {
  company: string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  email2: string;
};

const norm = (s: string) => (s ?? "").toString().trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(url, srk, { auth: { persistSession: false } });

  const report: Record<string, unknown> = {};

  // 1. Load source data from storage
  const { data: blob, error: dlErr } = await supa.storage
    .from("import-staging")
    .download("contacts.json");
  if (dlErr) {
    return new Response(JSON.stringify({ error: "download failed", dlErr }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const records: Rec[] = JSON.parse(await blob.text());
  report.spreadsheet_rows = records.length;

  // 2. Load all clients (paginated; supabase default cap is 1000)
  const allClients: { id: string; company_name: string; created_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa
      .from("clients")
      .select("id,company_name,created_at")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allClients.push(...data);
    if (data.length < 1000) break;
  }
  report.clients_before = allClients.length;

  // 3. Group by normalized company name; keep oldest as canonical, remap dupes
  const byName = new Map<string, { id: string; company_name: string; created_at: string }[]>();
  for (const c of allClients) {
    const k = norm(c.company_name);
    if (!k) continue;
    const arr = byName.get(k) ?? [];
    arr.push(c);
    byName.set(k, arr);
  }
  const remap = new Map<string, string>(); // dupId -> canonicalId
  let dupClientIds: string[] = [];
  for (const [, arr] of byName) {
    if (arr.length <= 1) continue;
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const canonical = arr[0].id;
    for (let i = 1; i < arr.length; i++) {
      remap.set(arr[i].id, canonical);
      dupClientIds.push(arr[i].id);
    }
  }
  report.duplicate_client_groups = byName.size - allClients.length + dupClientIds.length === 0 ? 0 : Array.from(byName.values()).filter(a => a.length > 1).length;
  report.duplicate_client_rows = dupClientIds.length;

  // 4. Repoint contacts that point at dup clients to the canonical client
  if (dupClientIds.length) {
    // Fetch all contacts pointing to dup clients
    const dupIdsArr = Array.from(remap.keys());
    let repointed = 0;
    // Process in batches of 100 ids
    for (let i = 0; i < dupIdsArr.length; i += 100) {
      const batch = dupIdsArr.slice(i, i + 100);
      const { data: contactsToFix, error } = await supa
        .from("contacts")
        .select("id,client_id")
        .in("client_id", batch);
      if (error) throw error;
      for (const c of contactsToFix ?? []) {
        const newId = remap.get(c.client_id);
        if (!newId) continue;
        const { error: upErr } = await supa
          .from("contacts")
          .update({ client_id: newId })
          .eq("id", c.id);
        if (!upErr) repointed++;
      }
    }
    report.contacts_repointed_to_canonical_client = repointed;

    // Now delete the dup client rows
    let deletedClients = 0;
    for (let i = 0; i < dupClientIds.length; i += 100) {
      const batch = dupClientIds.slice(i, i + 100);
      const { error } = await supa.from("clients").delete().in("id", batch);
      if (!error) deletedClients += batch.length;
    }
    report.duplicate_client_rows_deleted = deletedClients;
  }

  // 5. Re-fetch canonical clients (post-dedup)
  const canonicalClients: { id: string; company_name: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa
      .from("clients")
      .select("id,company_name")
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    canonicalClients.push(...data);
    if (data.length < 1000) break;
  }
  report.clients_after_dedup = canonicalClients.length;

  const clientByName = new Map<string, string>();
  for (const c of canonicalClients) clientByName.set(norm(c.company_name), c.id);

  // 6. Auto-create missing companies as clients
  const fileCompanies = new Set<string>();
  for (const r of records) {
    const k = norm(r.company);
    if (k) fileCompanies.add(k);
  }
  const missingCompanies: string[] = [];
  // Preserve original casing — pick first occurrence in file
  const firstSeen = new Map<string, string>();
  for (const r of records) {
    const k = norm(r.company);
    if (!k || clientByName.has(k) || firstSeen.has(k)) continue;
    firstSeen.set(k, r.company.trim());
  }
  for (const [k, original] of firstSeen) {
    if (!clientByName.has(k)) missingCompanies.push(original);
  }
  report.missing_companies_to_create = missingCompanies.length;

  let createdClients = 0;
  for (let i = 0; i < missingCompanies.length; i += 200) {
    const batch = missingCompanies.slice(i, i + 200).map((n) => ({
      company_name: n,
    }));
    const { data, error } = await supa
      .from("clients")
      .insert(batch)
      .select("id,company_name");
    if (error) throw error;
    for (const c of data ?? []) clientByName.set(norm(c.company_name), c.id);
    createdClients += data?.length ?? 0;
  }
  report.clients_created = createdClients;

  // 7. Dedup existing contacts (by client_id, lower(name), lower(email))
  const allContacts: { id: string; client_id: string; name: string; email: string; created_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa
      .from("contacts")
      .select("id,client_id,name,email,created_at")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allContacts.push(...data);
    if (data.length < 1000) break;
  }
  report.contacts_before_dedup = allContacts.length;

  const seenTriples = new Map<string, string>(); // key -> oldest id
  const dupContactIds: string[] = [];
  for (const c of allContacts) {
    const key = `${c.client_id}|${norm(c.name)}|${norm(c.email)}`;
    if (seenTriples.has(key)) dupContactIds.push(c.id);
    else seenTriples.set(key, c.id);
  }
  report.duplicate_contact_rows = dupContactIds.length;

  let deletedContacts = 0;
  for (let i = 0; i < dupContactIds.length; i += 200) {
    const batch = dupContactIds.slice(i, i + 200);
    const { error } = await supa.from("contacts").delete().in("id", batch);
    if (!error) deletedContacts += batch.length;
  }
  report.duplicate_contacts_deleted = deletedContacts;

  // 8. Diff spreadsheet against existing contacts; insert missing
  // Re-build seenTriples from surviving contacts
  const survivingTriples = new Set<string>();
  for (const [key, id] of seenTriples) {
    if (!dupContactIds.includes(id)) survivingTriples.add(key);
  }

  const toInsert: { client_id: string; name: string; email: string; phone: string; mobile_phone: string; secondary_email: string }[] = [];
  let skippedNoClient = 0;
  let skippedDup = 0;

  for (const r of records) {
    const k = norm(r.company);
    const cid = clientByName.get(k);
    if (!cid) {
      skippedNoClient++;
      continue;
    }
    const key = `${cid}|${norm(r.name)}|${norm(r.email)}`;
    if (survivingTriples.has(key)) {
      skippedDup++;
      continue;
    }
    survivingTriples.add(key);
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
    if (error) {
      report.insert_error = error.message;
      break;
    }
    inserted += batch.length;
  }
  report.inserted = inserted;

  // 9. Final counts
  const { count: finalContactCount } = await supa
    .from("contacts")
    .select("*", { count: "exact", head: true });
  const { count: finalClientCount } = await supa
    .from("clients")
    .select("*", { count: "exact", head: true });
  report.final_contacts = finalContactCount;
  report.final_clients = finalClientCount;

  return new Response(JSON.stringify(report, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
