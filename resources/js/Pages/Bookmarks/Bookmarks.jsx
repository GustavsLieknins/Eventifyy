import React, { useState, useRef, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import './Bookmarks.css';
import TopNav from '@/Shared/TopNav';
import { mapsLinkFromHotel, fmtDuration } from '../Dashboard/utils';
import useToasts from '../Dashboard/hooks/useToasts';
import Toasts from '../Dashboard/Components/Toasts';

import Icon from './Components/Ui/Icon';
import Button from './Components/Ui/Button';
import Card from './Components/Ui/Card';
import Section from './Components/Ui/Section';
import Empty from './Components/Ui/Empty';

import ConfirmDialog from './Components/ConfirmDialog';
import TripMapPane from './Components/TripMapPane';
import FlightList from './Components/FlightList';
import HotelList from './Components/HotelList';
import useVisitBeacon from '@/Shared/useVisitBeacon';
import TripGlobeArcCDN from './Components/TripGlobeArcCDN';

const RELAY_KEY = 'toastRelay';


// =============================================
// Helper: Share or copy a link
// =============================================

async function shareOrCopyLink(url, title = 'Share link') {
  // Try the native share API first (mobile)
  if (navigator.share && /^https?:\/\//i.test(url)) {
    try {
      await navigator.share({ url, title });
      return { ok: true, method: 'share' };
    } catch {
      // User cancelled or share failed, fall through to clipboard
    }
  }

  // Try the modern clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, method: 'clipboard' };
    } catch {
      // Clipboard blocked, fall through to legacy method
    }
  }

  // Legacy fallback: create a hidden textarea and copy from it
  try {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return { ok: true, method: 'execCommand' };
  } catch {
    return { ok: false, method: 'none' };
  }
}


// =============================================
// Pure helpers (no component state dependency)
// =============================================

function buildFlightsLink(flight) {
  const origin = flight?.fromId || flight?.legs?.[0]?.departureAirport?.id || '';
  const destination = flight?.toId || flight?.legs?.slice(-1)?.[0]?.arrivalAirport?.id || '';

  const rawDate = flight?.depart || flight?.legs?.[0]?.departureAirport?.time || '';
  const dateString = (typeof rawDate === 'string' && rawDate.length >= 10)
    ? rawDate.slice(0, 10)
    : '';

  const searchParts = [
    origin && `${origin} to`,
    destination,
    dateString,
    'flights',
  ].filter(Boolean);

  const query = encodeURIComponent(searchParts.join(' '));

  return {
    flightsUrl: `https://www.google.com/travel/flights?q=${query}`,
    searchUrl: `https://www.google.com/search?q=${query}`,
  };
}

function formatPrice(amount, currency = 'EUR') {
  if (typeof amount !== 'number') return '---';
  return amount.toLocaleString(undefined, { style: 'currency', currency });
}

function buildTripEmbedUrl(trip) {
  if (!trip) return null;

  const flight = trip.flights?.[0];
  const hotel = trip.hotels?.[0];

  // Figure out origin and destination for the map
  const origin = flight?.fromId
    ? `${flight.fromId} Airport`
    : (flight?.legs?.[0]?.departureAirport?.name || '');

  let destination = '';
  if (hotel?.gps?.latitude && hotel?.gps?.longitude) {
    destination = `${hotel.gps.latitude},${hotel.gps.longitude}`;
  } else if (hotel?.title || hotel?.address) {
    destination = [hotel.title, hotel.address].filter(Boolean).join(' ');
  } else if (flight?.toId) {
    destination = `${flight.toId} Airport`;
  }

  if (!origin || !destination) return null;

  // Use Google Maps Embed API if we have a key, otherwise fallback
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;

  if (apiKey) {
    const encodedOrigin = encodeURIComponent(origin);
    const encodedDest = encodeURIComponent(destination);
    return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodedOrigin}&destination=${encodedDest}&mode=transit`;
  }

  const query = encodeURIComponent(`${origin} to ${destination}`);
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

function buildTripExternalUrl(trip) {
  if (!trip) return null;

  const flight = trip.flights?.[0];
  const hotel = trip.hotels?.[0];

  const origin = flight?.fromId
    ? `${flight.fromId} Airport`
    : (flight?.legs?.[0]?.departureAirport?.name || '');

  const destination = hotel?.address || hotel?.title || (flight?.toId ? `${flight.toId} Airport` : '');

  if (!origin || !destination) return null;

  const encodedOrigin = encodeURIComponent(origin);
  const encodedDest = encodeURIComponent(destination);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDest}`;
}

function getTripDestination(trip) {
  if (trip?.flights?.[0]) {
    return `${trip.flights[0].fromId} → ${trip.flights[0].toId}`;
  }
  if (trip?.hotels?.[0]) {
    return trip.hotels[0].title;
  }
  return 'Unknown';
}


// =============================================
// Main Bookmarks page component
// =============================================

export default function Bookmarks({ trips: initialTrips }) {
  useVisitBeacon();
  const { flash } = usePage().props;

  // --- State ---
  const [trips, setTrips] = useState(() => initialTrips || []);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [deletingTripId, setDeletingTripId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, trip: null });
  const modalRef = useRef(null);

  // --- Toasts ---
  const { toasts, pushToast, dismissToast } = useToasts();


  // =============================================
  // Check for a "relay toast" from the Dashboard page
  // (shown after saving a trip and redirecting here)
  // =============================================

  useEffect(() => {
    let frameId;
    let attempts = 0;

    function checkForRelayToast() {
      attempts += 1;

      try {
        const raw = sessionStorage.getItem(RELAY_KEY);

        if (raw) {
          const data = JSON.parse(raw);
          const now = Date.now();

          // Expired? Remove it
          if (data.until && now > data.until) {
            sessionStorage.removeItem(RELAY_KEY);
            return;
          }

          // Ready to show? (respects notBefore delay)
          const isReady = !data._shown && (!data.notBefore || now >= data.notBefore);

          if (isReady) {
            pushToast({ title: data.title || data.message || 'Done', tone: data.tone || 'ok', ttl: data.ttl || 4800 });
            data._shown = true;
            sessionStorage.setItem(RELAY_KEY, JSON.stringify(data));
          }
        }
      } catch {
        // sessionStorage might not be available
      }

      // Keep checking for up to 120 animation frames
      if (attempts < 120) {
        frameId = requestAnimationFrame(checkForRelayToast);
      }
    }

    frameId = requestAnimationFrame(checkForRelayToast);
    return () => cancelAnimationFrame(frameId);
  }, []);


  // =============================================
  // Actions: open, close, delete, share
  // =============================================

  function openTrip(trip) {
    setSelectedTrip(trip);
  }

  function closeTrip() {
    setSelectedTrip(null);
  }

  async function deleteTrip(tripId) {
    try {
      setDeletingTripId(tripId);

      const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

      const response = await fetch(`/bookmarks/${tripId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to delete trip');

      // Remove the trip from state
      setTrips((previous) => previous.filter((trip) => trip.id !== tripId));

      // If we were viewing this trip, close the modal
      setSelectedTrip((current) => (current?.id === tripId ? null : current));

      pushToast({ title: 'Trip deleted', tone: 'ok' });
    } catch {
      pushToast({ title: 'Failed to delete trip', tone: 'error' });
    } finally {
      setDeletingTripId(null);
    }
  }

  async function createShareLink(tripId) {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

      const response = await fetch('/share-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ trip_id: tripId }),
        credentials: 'same-origin',
      });

      if (!response.ok) throw new Error('Failed to create link');

      const data = await response.json();
      const rawUrl = data?.url;

      if (!rawUrl) throw new Error('Invalid response');

      const fullUrl = new URL(rawUrl, window.location.origin).toString();
      const result = await shareOrCopyLink(fullUrl, 'Eventify trip');

      if (result.ok) {
        const message = result.method === 'share' ? 'Share sheet opened' : 'Link copied!';
        pushToast({ title: message, tone: 'ok' });
      } else {
        pushToast({ title: 'Copy this link: ' + fullUrl, tone: 'ok', ttl: 8000 });
      }
    } catch {
      pushToast({ title: 'Could not create link', tone: 'error' });
    }
  }


  // =============================================
  // Keyboard: close modal on Escape
  // =============================================

  useEffect(() => {
    if (!selectedTrip) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedTrip(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrip]);


  // =============================================
  // Confirm dialog helpers
  // =============================================

  function requestDelete(trip) {
    setConfirmDialog({ open: true, trip });
  }

  function cancelDelete() {
    setConfirmDialog({ open: false, trip: null });
  }

  async function confirmDelete() {
    if (!confirmDialog.trip) return;
    await deleteTrip(confirmDialog.trip.id);
    cancelDelete();
  }


  const hasTrips = trips && trips.length > 0;


  // =============================================
  // Render
  // =============================================

  return (
    <>
      <TopNav active="bookmarks" />

      <div className="page">
        {/* Toast notifications */}
        <Toasts toasts={toasts} onDismiss={dismissToast} />

        {/* Page header */}
        <header className="page__head" role="banner">
          <h1 className="page__title">My Bookmarked Trips</h1>
        </header>

        {/* Empty state or trip list */}
        {!hasTrips ? (
          <Card interactive={false}>
            <Empty
              title="No trips bookmarked yet"
              hint="Search events on the dashboard, pick a flight and/or hotel, then bookmark the trip."
            />
          </Card>
        ) : (
          <div className="trip-list">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="trip"
                onClick={() => openTrip(trip)}
                aria-label={`Open ${trip.title}`}
              >
                <div className="trip__left">
                  <h3 className="trip__title">{trip.title}</h3>
                  <div className="trip__where">{getTripDestination(trip)}</div>
                </div>

                <div className="trip__actions" onClick={(event) => event.stopPropagation()}>
                  <Button size="sm" variant="accent" type="button" onClick={() => openTrip(trip)}>
                    View
                  </Button>

                  <Button
                    size="sm"
                    variant="glass"
                    type="button"
                    onClick={(event) => { event.stopPropagation(); createShareLink(trip.id); }}
                    title="Create shareable link"
                    iconLeft={<Icon name="link" />}
                  >
                    Share link
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    type="button"
                    onClick={(event) => { event.stopPropagation(); requestDelete(trip); }}
                    disabled={deletingTripId === trip.id}
                    iconLeft={<Icon name="trash" />}
                  >
                    {deletingTripId === trip.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Trip detail modal */}
        {selectedTrip && (
          <div className="modal-wrap" onClick={closeTrip} aria-modal="true" role="dialog">
            <div
              className="modal"
              onClick={(event) => event.stopPropagation()}
              ref={modalRef}
              tabIndex={-1}
            >
              <button className="modal__close" onClick={closeTrip} aria-label="Close">
                <Icon name="x" />
              </button>

              <div className="modal__header">
                <h2 className="modal__title">{selectedTrip.title}</h2>
                <div className="modal__sub">
                  {selectedTrip?.flights?.[0]
                    ? `${selectedTrip.flights[0].fromId} → ${selectedTrip.flights[0].toId}`
                    : selectedTrip?.hotels?.[0]?.address || 'Trip details'}
                </div>
              </div>

              <div className="modal__scroll">
                <TripGlobeArcCDN trip={selectedTrip} />

                <TripMapPane
                  trip={selectedTrip}
                  buildTripEmbedUrl={buildTripEmbedUrl}
                  buildTripExternalUrl={buildTripExternalUrl}
                />

                <div className="modal__grid">
                  <Section title="Flights" icon={<Icon name="plane" />}>
                    <FlightList
                      flights={selectedTrip.flights || []}
                      buildFlightsLink={buildFlightsLink}
                      fmtPrice={formatPrice}
                      fmtDuration={fmtDuration}
                    />
                  </Section>

                  <Section title="Hotels" icon={<Icon name="hotel" />}>
                    <HotelList
                      hotels={selectedTrip.hotels || []}
                      mapsLinkFromHotel={mapsLinkFromHotel}
                    />
                  </Section>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Delete this trip?"
        message={confirmDialog.trip ? `"${confirmDialog.trip.title}" will be permanently removed.` : ''}
        busy={!!(confirmDialog.trip && deletingTripId === confirmDialog.trip.id)}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}
