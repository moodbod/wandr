const url = 'https://router.project-osrm.org/trip/v1/driving/14.513,-22.682;14.543,-22.667;14.538,-22.689;14.514,-22.673?overview=full&geometries=geojson&source=first&destination=last&roundtrip=false';
fetch(url, { headers: { 'User-Agent': 'WandrApp/1.0 (Mobile Travel App)' } })
  .then(res => res.text())
  .then(text => console.log('RESPONSE:', text))
  .catch(err => console.error('ERROR:', err));
