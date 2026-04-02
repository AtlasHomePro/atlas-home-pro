exports.handler = async function() {
  const res = await fetch(
    'https://api.airtable.com/v0/appgB6l8O3dxXFVIM/Products',
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` } }
  );
  const data = await res.json();
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data)
  };
};
