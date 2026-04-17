import React, { useEffect, useRef, useState } from 'react';
import geo from '@/data/geo.json';

const GLOBE_CDN = 'https://cdn.jsdelivr.net/npm/globe.gl';
const EARTH_IMG = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg';
const BUMP_IMG  = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png';

function deg2rad(d) { return d * Math.PI / 180; }

function greatCircleAlt(a, b) {
  if (!a || !b) return 2.1;
  const f1 = deg2rad(a.lat), f2 = deg2rad(b.lat), dl = deg2rad(b.lng - a.lng);
  const cosc = Math.sin(f1) * Math.sin(f2) + Math.cos(f1) * Math.cos(f2) * Math.cos(dl);
  const central = Math.acos(Math.min(1, Math.max(-1, cosc)));
  return 1.9 + (central / Math.PI) * 0.7;
}

async function loadCDN() {
  if (window.Globe) return;
  await new Promise((resolve, reject) => {
    const tag = document.querySelector('script[data-globe-cdn]');
    if (tag) { tag.addEventListener('load', resolve, { once: true }); tag.addEventListener('error', reject, { once: true }); return; }
    const s = document.createElement('script');
    s.src = GLOBE_CDN; s.async = true; s.defer = true; s.setAttribute('data-globe-cdn', '1');
    s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });
}

// Look up the country centroid for a given IATA code
function countryFromIata(iata) {
  if (!iata) return null;
  const code = String(iata).toUpperCase();
  const countryCode = geo.iataToCountry?.[code];
  if (!countryCode) return null;
  const country = geo.countries?.[countryCode];
  if (!country) return null;
  return { lat: country.lat, lng: country.lng, name: country.name, code: countryCode };
}

export default function TripGlobeArc({ trip, height = 420 }) {
  const hostRef = useRef(null);
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false, ro;

    (async () => {
      if (!trip) return;

      const flight = trip?.flights?.[0] || null;
      const firstLeg = flight?.legs?.[0] || {};
      const lastLeg  = flight?.legs?.slice(-1)?.[0] || {};
      const fromIata = flight?.fromId || (firstLeg.departureAirport || firstLeg.departure_airport)?.id || '';
      const toIata   = flight?.toId   || (lastLeg.arrivalAirport || lastLeg.arrival_airport)?.id || '';

      const from = countryFromIata(fromIata);
      const to   = countryFromIata(toIata);

      if (disposed) return;
      if (!from || !to) { setReady(false); return; }

      await loadCDN();
      if (disposed) return;

      const inner = document.createElement('div');
      inner.style.cssText = 'width:100%;height:100%;position:relative';
      mountRef.current = inner;
      hostRef.current.appendChild(inner);

      const g = new window.Globe(inner, { waitForGlobeReady: true, animateIn: true })
        .backgroundColor('#00000000')
        .globeImageUrl(EARTH_IMG)
        .bumpImageUrl(BUMP_IMG)
        .showAtmosphere(true)
        .atmosphereColor('#98b8ff')
        .atmosphereAltitude(0.22)
        .arcsData([{ startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng }])
        .arcAltitude(0.2)
        .arcStroke(0.25)
        .arcColor(() => ['#7aa7ff', '#e0ecff'])
        .arcDashLength(0.5)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2200)
        .labelsData([
          { lat: from.lat, lng: from.lng, text: from.name },
          { lat: to.lat,   lng: to.lng,   text: to.name },
        ])
        .labelSize(0.9)
        .labelColor(() => '#e6eefc')
        .labelAltitude(0.01)
        .ringsData([
          { lat: from.lat, lng: from.lng, maxR: 2.5, color: '#86a9ff' },
          { lat: to.lat,   lng: to.lng,   maxR: 2.5, color: '#ffd1a8' },
        ])
        .ringMaxRadius(d => d.maxR)
        .ringColor(d => [d.color, 'rgba(255,255,255,0)'])
        .ringRepeatPeriod(900)
        .ringPropagationSpeed(1.3)
        .onGlobeReady(() => setReady(true));

      const controls = g.controls();
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.22;

      const size = () => {
        const w = hostRef.current.clientWidth || 800;
        g.width(w); g.height(height);
      };
      size();
      ro = new ResizeObserver(size);
      ro.observe(hostRef.current);

      const alt = greatCircleAlt(from, to);
      g.pointOfView({ lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2, altitude: alt }, 900);

      globeRef.current = g;
    })();

    return () => {
      disposed = true;
      if (ro && hostRef.current) ro.unobserve(hostRef.current);
      if (mountRef.current && hostRef.current?.contains(mountRef.current)) hostRef.current.removeChild(mountRef.current);
      globeRef.current = null;
    };
  }, [trip, height]);

  return (
    <div className="card trip-globe">
      <div className="card-title">Route preview</div>
      <div ref={hostRef} style={{ width: '100%', height }} />
      {!ready && <div className="muted center" style={{ padding: 12 }}>Loading route…</div>}
    </div>
  );
}
