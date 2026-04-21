const { fetch } = require('undici');

async function test() {
  const coordString = '13.4014,52.5192;13.3982,52.5002';
  const url = `https://routing.openstreetmap.de/routed-car/trip/v1/driving/${coordString}?overview=full&geometries=geojson&source=first&destination=last&roundtrip=false`;
  
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}

test();
