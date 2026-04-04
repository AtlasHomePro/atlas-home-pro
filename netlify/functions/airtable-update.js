// Temporary function to proxy Airtable record updates
// Will be removed after data fixes are applied
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const BASE_ID = "appgB6l8O3dxXFVIM";
const TABLE_ID = "tblQ7CbY7NgtTSv6W";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { recordId, fields } = JSON.parse(event.body);
    if (!recordId || !fields) {
      return { statusCode: 400, body: JSON.stringify({ error: "recordId and fields required" }) };
    }

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    const data = await res.json();
    return {
      statusCode: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
