// Temporary function to batch-update supplier records
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || "";
const BASE_ID = "appgB6l8O3dxXFVIM";
const SUPPLIERS_TABLE = "tblD4CWpmBkYjx8tg";
const AIRTABLE_API = "https://api.airtable.com/v0";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }
  
  const body = await request.json();
  const { updates } = body; // array of { id, fields: { ... } }
  
  if (!updates || !Array.isArray(updates)) {
    return new Response(JSON.stringify({ error: "Need updates array" }), { status: 400 });
  }
  
  const results = [];
  
  // Airtable allows batches of 10
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    const payload = {
      records: batch.map(u => ({
        id: u.id,
        fields: u.fields
      }))
    };
    
    const resp = await fetch(`${AIRTABLE_API}/${BASE_ID}/${SUPPLIERS_TABLE}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      results.push({ batch: i, error: err.error?.message || `Status ${resp.status}` });
    } else {
      const data = await resp.json();
      results.push({ batch: i, count: data.records?.length || 0 });
    }
  }
  
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/update-suppliers" };
