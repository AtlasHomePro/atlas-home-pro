exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return { statusCode: 500, body: 'No token' };
  try {
    const { records } = JSON.parse(event.body);
    if (!records || !Array.isArray(records) || records.length > 10) return { statusCode: 400, body: 'Bad request' };
    const res = await fetch('https://api.airtable.com/v0/appgB6l8O3dxXFVIM/Van%20Catalog', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    const data = await res.json();
    return { statusCode: res.ok ? 200 : res.status, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};
