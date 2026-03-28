// Atlas Procurement API — Netlify Serverless Function
// Handles all /api/* routes for the procurement system

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || "";
const BASE_ID = "appgB6l8O3dxXFVIM";
const PROCUREMENT_TABLE = "tblOZc5KgfYER7Z2X";
const SUPPLIERS_TABLE = "tblD4CWpmBkYjx8tg";
const HISTORY_TABLE = "tbleKhNF3hNsB8hZn";
const AIRTABLE_API = "https://api.airtable.com/v0";

// ── Helper: Airtable fetch ──
async function airtableFetch(endpoint, options = {}) {
  const resp = await fetch(`${AIRTABLE_API}/${BASE_ID}/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Airtable error ${resp.status}`);
  }
  return resp.json();
}

// ── Helper: JSON response ──
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// ── Helper: Parse multipart form data for photo uploads ──
async function parseMultipart(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    return { fields: body, files: [] };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const fields = {};
    const files = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File || (value && typeof value === "object" && value.arrayBuffer)) {
        try {
          const buffer = await value.arrayBuffer();
          files.push({
            fieldname: key,
            originalname: value.name || `photo_${Date.now()}.jpg`,
            mimetype: value.type || "image/jpeg",
            buffer: Buffer.from(buffer),
          });
        } catch (e) {
          console.log("File parse error:", e.message);
        }
      } else {
        fields[key] = value;
      }
    }
    return { fields, files };
  }

  // Fallback: try JSON
  try {
    const body = await request.json();
    return { fields: body, files: [] };
  } catch {
    return { fields: {}, files: [] };
  }
}

// ── Helper: Upload photo to temp host for Airtable attachment ──
async function uploadToTempHost(buffer, filename, mimetype) {
  // Try tmpfiles.org first
  try {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimetype });
    formData.append("file", blob, filename);
    const resp = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formData,
    });
    if (resp.ok) {
      const data = await resp.json();
      const directUrl = data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      return { url: directUrl };
    }
  } catch (e) {
    console.log("tmpfiles.org failed:", e.message);
  }

  // Try file.io as fallback
  try {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimetype });
    formData.append("file", blob, filename);
    const resp = await fetch("https://file.io/?expires=1h", {
      method: "POST",
      body: formData,
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) return { url: data.link };
    }
  } catch (e) {
    console.log("file.io failed:", e.message);
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ════════════════════════════════════════════════════════════════

export default async (request, context) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";

  try {
    // ── GET /api/requests ──
    if (path === "/requests" && request.method === "GET") {
      let allRecords = [];
      let offset = null;

      do {
        let endpoint = `${PROCUREMENT_TABLE}?pageSize=100&sort[0][field]=created_at&sort[0][direction]=desc`;
        if (offset) endpoint += `&offset=${offset}`;
        const data = await airtableFetch(endpoint);
        allRecords = allRecords.concat(data.records);
        offset = data.offset || null;
      } while (offset);

      // Sort by urgency, then date
      const urgencyOrder = { Emergency: 0, Urgent: 1, Standard: 2, Planned: 3 };
      allRecords.sort((a, b) => {
        const ua = urgencyOrder[a.fields.urgency] ?? 9;
        const ub = urgencyOrder[b.fields.urgency] ?? 9;
        if (ua !== ub) return ua - ub;
        return new Date(b.fields.created_at || 0) - new Date(a.fields.created_at || 0);
      });

      const requests = allRecords.map((r) => ({
        id: r.id,
        request_id: r.fields.request_id,
        created_at: r.fields.created_at,
        submitted_by: r.fields.submitted_by || "",
        job_address: r.fields.job_address || "",
        raw_description: r.fields.raw_description || "",
        photos: (r.fields.photos || []).map((p) => ({
          url: p.url,
          thumb: p.thumbnails?.small?.url || p.thumbnails?.large?.url || p.url,
        })),
        trade: r.fields.trade || "",
        item_type: r.fields.item_type || "",
        urgency: r.fields.urgency || "Standard",
        status: r.fields.status || "Submitted",
        ai_part_name: r.fields.ai_part_name || "",
        ai_brand: r.fields.ai_brand || "",
        ai_model_number: r.fields.ai_model_number || "",
        ai_specs: r.fields.ai_specs || "",
        ai_confidence: r.fields.ai_confidence || "",
        ai_clarification_needed: r.fields.ai_clarification_needed || "",
        ai_category_tags: r.fields.ai_category_tags || [],
        coordinator_script: r.fields.coordinator_script || "",
        coordinator_notes: r.fields.coordinator_notes || "",
        fulfillment_method: r.fields.fulfillment_method || "",
        recommended_supplier: r.fields.recommended_supplier || [],
        alternate_supplier: r.fields.alternate_supplier || [],
        order_confirmation: r.fields.order_confirmation || "",
        pickup_location: r.fields.pickup_location || "",
        estimated_cost: r.fields.estimated_cost || null,
      }));

      return jsonResponse(requests);
    }

    // ── POST /api/requests ──
    if (path === "/requests" && request.method === "POST") {
      const { fields: body, files } = await parseMultipart(request);
      const { name, jobAddress, description, urgency, trade } = body;

      if (!name || !description || !urgency) {
        return jsonResponse({ error: "Name, description, and urgency are required" }, 400);
      }

      // Upload photos
      const attachments = [];
      for (const file of files) {
        const result = await uploadToTempHost(file.buffer, file.originalname, file.mimetype);
        if (result) attachments.push(result);
      }

      const recordFields = {
        submitted_by: name,
        raw_description: description,
        urgency: urgency,
        status: "Submitted",
        role: "Tech",
      };

      if (jobAddress) recordFields.job_address = jobAddress;
      if (trade) recordFields.trade = trade;
      if (attachments.length > 0) recordFields.photos = attachments;

      const record = await airtableFetch(PROCUREMENT_TABLE, {
        method: "POST",
        body: JSON.stringify({ fields: recordFields }),
      });

      return jsonResponse({ success: true, id: record.id });
    }

    // ── GET /api/suppliers ──
    if (path === "/suppliers" && request.method === "GET") {
      let allRecords = [];
      let offset = null;

      do {
        let endpoint = `${SUPPLIERS_TABLE}?pageSize=100`;
        if (offset) endpoint += `&offset=${offset}`;
        const data = await airtableFetch(endpoint);
        allRecords = allRecords.concat(data.records);
        offset = data.offset || null;
      } while (offset);

      const suppliers = allRecords.map((r) => ({
        id: r.id,
        company_name: r.fields.company_name || "",
        trade_category: r.fields.trade_category || [],
        phone: r.fields.phone || "",
        website: r.fields.website || "",
        la_locations: r.fields.la_locations || "",
        pickup: r.fields.pickup || false,
        delivery: r.fields.delivery || false,
        preferred_contact_method: r.fields.preferred_contact_method || "",
      }));

      return jsonResponse(suppliers);
    }

    // ── PATCH /api/requests/:id/status ──
    const statusMatch = path.match(/^\/requests\/([^/]+)\/status$/);
    if (statusMatch && request.method === "PATCH") {
      const recordId = statusMatch[1];
      const body = await request.json();
      const { status, coordinator_notes, order_confirmation, pickup_location, estimated_cost } = body;

      if (!status) return jsonResponse({ error: "Status required" }, 400);

      // Get current record
      const current = await airtableFetch(`${PROCUREMENT_TABLE}/${recordId}`);
      const oldStatus = current.fields.status || "Unknown";

      // Update procurement request
      const updateFields = { status };
      if (coordinator_notes !== undefined) updateFields.coordinator_notes = coordinator_notes;
      if (order_confirmation !== undefined) updateFields.order_confirmation = order_confirmation;
      if (pickup_location !== undefined) updateFields.pickup_location = pickup_location;
      if (estimated_cost !== undefined) updateFields.estimated_cost = parseFloat(estimated_cost) || null;
      if (status === "Fulfilled") updateFields.fulfilled_at = new Date().toISOString().split("T")[0];

      await airtableFetch(`${PROCUREMENT_TABLE}/${recordId}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: updateFields }),
      });

      // Create status history record
      await airtableFetch(HISTORY_TABLE, {
        method: "POST",
        body: JSON.stringify({
          fields: {
            request_id: [recordId],
            old_status: oldStatus,
            new_status: status,
            changed_by: "Coordinator (Dashboard)",
            note: coordinator_notes || `Status changed from ${oldStatus} to ${status}`,
          },
        }),
      });

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
};

export const config = {
  path: "/api/*",
};
