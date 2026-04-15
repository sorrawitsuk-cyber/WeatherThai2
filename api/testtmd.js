// Test endpoint to debug TMD API from Vercel environment
export default async function handler(req, res) {
  const token = process.env.TMD_API_TOKEN;
  
  if (!token) {
    return res.status(500).json({ error: 'TMD_API_TOKEN not found in env' });
  }

  const results = {};

  // Test 1: Simple /at endpoint with coordinates (Bangkok)
  try {
    const url1 = 'https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at?lat=13.75&lon=100.50&fields=tc,rh&duration=1';
    const r1 = await fetch(url1, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${token}`
      }
    });
    const body1 = await r1.text();
    results.test1_at = {
      status: r1.status,
      statusText: r1.statusText,
      headers: Object.fromEntries(r1.headers.entries()),
      body: body1.substring(0, 500)
    };
  } catch (e) {
    results.test1_at = { error: e.message };
  }

  // Test 2: /region endpoint without date/hour
  try {
    const url2 = 'https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/region?region=C&fields=tc,rh&duration=1';
    const r2 = await fetch(url2, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${token}`
      }
    });
    const body2 = await r2.text();
    results.test2_region_no_date = {
      status: r2.status,
      statusText: r2.statusText,
      body: body2.substring(0, 500)
    };
  } catch (e) {
    results.test2_region_no_date = { error: e.message };
  }

  // Test 3: /region with explicit date/hour 
  try {
    const url3 = 'https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/region?region=C&fields=tc,rh&date=2026-04-15&hour=10&duration=1';
    const r3 = await fetch(url3, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${token}`
      }
    });
    const body3 = await r3.text();
    results.test3_region_with_date = {
      status: r3.status,
      statusText: r3.statusText,
      body: body3.substring(0, 500)
    };
  } catch (e) {
    results.test3_region_with_date = { error: e.message };
  }

  // Test 4: /place endpoint (province-based)
  try {
    const url4 = encodeURI('https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/place?province=กรุงเทพมหานคร&fields=tc,rh&duration=1');
    const r4 = await fetch(url4, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${token}`
      }
    });
    const body4 = await r4.text();
    results.test4_place = {
      status: r4.status,
      statusText: r4.statusText,
      body: body4.substring(0, 500)
    };
  } catch (e) {
    results.test4_place = { error: e.message };
  }

  // Test 5: Simple fields only
  try {
    const url5 = 'https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/region?region=C&fields=tc&duration=1';
    const r5 = await fetch(url5, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${token}`
      }
    });
    const body5 = await r5.text();
    results.test5_region_single_field = {
      status: r5.status,
      statusText: r5.statusText,
      body: body5.substring(0, 500)
    };
  } catch (e) {
    results.test5_region_single_field = { error: e.message };
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    tokenPrefix: token.substring(0, 20) + '...',
    results
  });
}
