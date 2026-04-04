// Temporary function to proxy Airtable record updates
// Will be removed after data fixes are applied
const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = "appgB6l8O3dxXFVIM";
const TABLE = "tblQ7CbY7NgtTSv6W";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { recordId, fields } = JSON.parse(event.body);
    if (!recordId || !fields) {
      return { statusCode: 400, body: JSON.stringify({ error: "recordId and fields required" }) };
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${TABLE}/${recordId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    const data = await res.json();
    return {
      statusCode: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
