import axios from 'axios';
import geo from '@/data/geo.json';

// === Constants ===

export const DEFAULT_GL = 'gb';
export const DEFAULT_HL = 'en';
export const DEFAULT_EVENT_LOCATION = '';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toIsoDate(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function join(arr, sep = ' • ') {
  return arr.filter(Boolean).join(sep);
}

export function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString() : n;
}

export function fmtDuration(mins) {
  if (!mins || isNaN(mins)) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
}

export function fmtDateTimeSimple(s) {
  if (!s || typeof s !== 'string') return '';
  const [date, time] = s.split(' ');
  if (!date) return s;
  const [Y, M, D] = date.split('-').map(Number);
  const label = isNaN(D) ? date : `${pad2(D)} ${MONTHS[(M || 1) - 1]}`;
  return time ? `${label} • ${time}` : label;
}

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', NOK: 'kr' };

// Pull the currency code out of the API request URL (e.g. "...&curr=USD&...").
function extractCurrencyCode(url) {
  const match = String(url || '').match(/curr=([A-Z]{3})/);
  return match ? match[1] : 'EUR';
}

function currencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code + ' ';
}

export function inferCurrencySymbol(data) {
  const url = data?.requestMetadata?.url || '';
  const code = extractCurrencyCode(url);
  return currencySymbol(code);
}

// === Date Parsing ===

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export function parseEventDate(text) {
  if (!text || typeof text !== 'string') return '';

  // Already ISO format: "2026-04-11"
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // "11 Apr" or "11 Apr,"
  const dayMonthMatch = text.toLowerCase().match(/(\d{1,2})\s([a-z]{3,5})/);
  if (dayMonthMatch) {
    const day = +dayMonthMatch[1];
    const month = MONTH_MAP[dayMonthMatch[2]];
    if (!month) return '';
    let year = new Date().getFullYear();
    if (new Date(year, month - 1, day) < new Date()) year++;
    return toIsoDate(year, month, day);
  }

  // "April 11, 2026"
  const longMatch = text.toLowerCase().match(/([a-z]{3,10})\s(\d{1,2}),?\s(\d{4})/);
  if (longMatch) {
    const month = MONTH_MAP[longMatch[1]];
    const day = +longMatch[2];
    const year = +longMatch[3];
    if (month && day && year) return toIsoDate(year, month, day);
  }

  return '';
}

export function getEventTravelDates(evt) {
  const eventDate = evt?.startDate?.match(/^\d{4}-\d{2}-\d{2}/)
    ? evt.startDate.slice(0, 10)
    : parseEventDate(evt?.when || '');

  if (!eventDate) return { eventISO: '', departISO: '', returnISO: '' };

  const date = new Date(`${eventDate}T12:00:00`);
  const dayBefore = new Date(date);
  dayBefore.setDate(date.getDate() - 1);
  const dayAfter = new Date(date);
  dayAfter.setDate(date.getDate() + 1);

  return {
    eventISO: eventDate,
    departISO: toIsoDate(dayBefore.getFullYear(), dayBefore.getMonth() + 1, dayBefore.getDate()),
    returnISO: toIsoDate(dayAfter.getFullYear(), dayAfter.getMonth() + 1, dayAfter.getDate()),
  };
}

// === Geography ===

const COUNTRY_NAMES_TO_ISO = {
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
  'united states': 'US', 'usa': 'US', 'america': 'US',
  'canada': 'CA', 'france': 'FR', 'germany': 'DE', 'italy': 'IT', 'spain': 'ES',
  'portugal': 'PT', 'netherlands': 'NL', 'belgium': 'BE', 'switzerland': 'CH',
  'austria': 'AT', 'poland': 'PL', 'czechia': 'CZ', 'czech republic': 'CZ',
  'hungary': 'HU', 'croatia': 'HR', 'serbia': 'RS', 'romania': 'RO', 'bulgaria': 'BG',
  'greece': 'GR', 'sweden': 'SE', 'norway': 'NO', 'finland': 'FI', 'denmark': 'DK',
  'ireland': 'IE', 'estonia': 'EE', 'latvia': 'LV', 'lithuania': 'LT',
  'turkey': 'TR', 'japan': 'JP', 'south korea': 'KR', 'china': 'CN', 'india': 'IN',
  'thailand': 'TH', 'australia': 'AU', 'new zealand': 'NZ',
  'brazil': 'BR', 'argentina': 'AR', 'mexico': 'MX',
  'south africa': 'ZA', 'egypt': 'EG', 'morocco': 'MA',
  'united arab emirates': 'AE', 'israel': 'IL', 'russia': 'RU', 'ukraine': 'UA',
};

export function getCityFromAddress(addr) {
  if (!Array.isArray(addr) || !addr.length) return '';

  const lastPart = String(addr[addr.length - 1] || '').trim();
  if (!lastPart) return '';

  const parts = lastPart.split(',').map(s => s.trim()).filter(Boolean);
  const city = parts.find(p => !/^\d/.test(p)) || parts[0] || '';
  const country = parts[parts.length - 1] || '';

  // Try to find a 2-letter ISO code
  let iso = '';
  if (/^[A-Z]{2}$/.test(country)) {
    iso = geo.stateProvinceToCountry[country] || country;
  } else {
    iso = COUNTRY_NAMES_TO_ISO[country.toLowerCase()] || '';
  }

  return iso ? `${city}, ${iso}` : city;
}

export function mapsLinkFromHotel(h) {
  if (h?.gps?.latitude && h?.gps?.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${h.gps.latitude},${h.gps.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h?.title || ''} ${h?.address || ''}`.trim())}`;
}

// === Airport Resolution (via backend Groq LLM) ===

export async function resolveCityToIataList(cityLabel = '') {
  const key = (cityLabel || '').trim();
  if (!key) return [];
  const { data } = await axios.get('/api/geo/airports', { params: { cityLabel: key } });
  return Array.isArray(data?.codes) ? data.codes : [];
}

export async function guessOriginIata(defaultIata = 'RIX') {
  try {
    const cached = sessionStorage.getItem('ef.originIata');
    if (cached) return cached;
    sessionStorage.setItem('ef.originIata', defaultIata);
    return defaultIata;
  } catch {
    return defaultIata;
  }
}

// === Event Normalization ===

export function normalizeEvents(payload) {
  const events = payload?.eventsResults || payload?.results || [];

  return events.map((e, i) => {
    // Address: SearchAPI gives a string, normalize to array
    const rawAddr = e?.address || '';
    const address = Array.isArray(rawAddr) ? rawAddr : (rawAddr ? [rawAddr] : []);

    // Date: SearchAPI gives { day, month } object + duration string
    const dateObj = e?.date || {};
    let when = '';
    if (typeof dateObj === 'string') when = dateObj;
    else if (dateObj?.when) when = dateObj.when;
    else if (e?.duration) when = e.duration;
    else if (dateObj?.day && dateObj?.month) when = `${dateObj.day} ${dateObj.month}`;

    const startDate = dateObj?.startDate || e?.startDate || '';
    const startISO = /^\d{4}-\d{2}-\d{2}/.test(startDate)
      ? startDate.slice(0, 10)
      : parseEventDate(typeof when === 'string' ? when : '');

    return {
      position: e?.position ?? i + 1,
      title: e?.title || `Event #${i + 1}`,
      when,
      startDate: startISO || '',
      venue: e?.venue?.name || e?.location || '',
      address,
      city: getCityFromAddress(address),
      link: e?.link || '',
      thumbnail: e?.thumbnail || '',
      description: e?.description || '',
      ticketInfo: e?.ticketInfo || e?.offers || [],
      eventLocationMap: e?.eventLocationMap || e?.event_location_map || null,
      venueDetails: e?.venue || null,
      _raw: e,
    };
  });
}


export function extractFlightOptions(data) {
  if (!data) return [];

  const bestFlights = data.bestFlights || data.best_flights || [];
  const otherFlights = data.otherFlights || data.other_flights || [];

  if (bestFlights.length || otherFlights.length) {
    return [...bestFlights, ...otherFlights];
  }

  return data.results || data.flights || [];
}

export function hasAnyFlights(data) {
  if (!data) return false;
  const best = data.bestFlights || data.best_flights || [];
  const other = data.otherFlights || data.other_flights || [];
  return best.length + other.length > 0;
}

export function normalizeFlightOption(opt) {
  const legs = opt?.flights || opt?.legs || [];
  const firstLeg = legs[0] || {};
  const lastLeg = legs[legs.length - 1] || firstLeg;

  const departure = firstLeg.departureAirport || firstLeg.departure_airport || {};
  const arrival = lastLeg.arrivalAirport || lastLeg.arrival_airport || {};

  // Build readable departure/arrival time strings
  const departTime = departure.time
    ? `${departure.date || ''} ${departure.time}`.trim()
    : (firstLeg.departureTime || firstLeg.departure_time || '');
  const arriveTime = arrival.time
    ? `${arrival.date || ''} ${arrival.time}`.trim()
    : (lastLeg.arrivalTime || lastLeg.arrival_time || '');

  return {
    price: opt?.price ?? opt?.priceTotal ?? opt?.price_total ?? null,
    type: opt?.type || (legs.length > 1 ? 'Multi-leg' : 'Trip'),
    totalDuration: opt?.totalDuration || opt?.total_duration || opt?.duration || 0,
    legs,
    fromId: departure.id || '',
    fromName: departure.name || '',
    toId: arrival.id || '',
    toName: arrival.name || '',
    depart: departTime,
    arrive: arriveTime,
    airlines: [...new Set(legs.map(l => l?.airline).filter(Boolean))],
    flightNumbers: legs.map(l => l?.flightNumber || l?.flight_number).filter(Boolean),
    travelClass: firstLeg.travelClass || firstLeg.travel_class || '',
    emissions: opt?.carbonEmissions || opt?.carbon_emissions || {},
  };
}


export function normalizeHotel(h) {
  return {
    title: h?.title || 'Hotel',
    thumbnail: h?.thumbnail || '',
    rating: h?.rating || null,
    reviews: h?.reviews || null,
    type: h?.type || '',
    stars: h?.stars || null,
    address: h?.address || '',
    phone: h?.phone || '',
    website: h?.website || '',
    gps: h?.gpsCoordinates || null,
    tags: h?.amenities || h?.serviceOptions || [],
  };
}


export function suggestTripTitle(evt, arrivalId) {
  const title = evt?.title || '';
  const city = evt?.city || '';
  const date = (evt?.startDate || '').slice(0, 10);

  const base = (title && city) ? `${title} — ${city}` : (title || city || 'My Trip');
  const hints = [arrivalId, date].filter(Boolean);
  return hints.length ? `${base} (${hints.join(' · ')})` : base;
}
