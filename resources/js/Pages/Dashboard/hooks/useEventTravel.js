import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import {
  hasAnyFlights,
  suggestTripTitle,
  resolveCityToIataList,
  extractFlightOptions,
  normalizeFlightOption,
  normalizeHotel,
  getEventTravelDates,
} from '../utils';

/**
 * Handles the travel modal: fetching flights, fetching hotels,
 * selecting options, and saving a trip bookmark.
 */
export default function useEventTravel(pushToast, originIata, userId) {

  // --- Modal state ---
  const [activeEvent, setActiveEvent] = useState(null);
  const [isTravelOpen, setIsTravelOpen] = useState(false);
  const modalRef = useRef(null);

  // --- Flight state ---
  const [flightResponse, setFlightResponse] = useState(null);
  const [resolvedArrivalIata, setResolvedArrivalIata] = useState('');
  const [arrivalOverride, setArrivalOverride] = useState('');
  const [isFlightsLoading, setIsFlightsLoading] = useState(false);

  // --- Hotel state ---
  const [hotelResults, setHotelResults] = useState([]);
  const [isHotelsLoading, setIsHotelsLoading] = useState(false);

  // --- Date state ---
  const [outboundDate, setOutboundDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // --- Selection state ---
  const [selectedFlightIndex, setSelectedFlightIndex] = useState(null);
  const [selectedHotelIndex, setSelectedHotelIndex] = useState(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);


  // =============================================
  // Lock body scroll & handle Escape key when modal is open
  // =============================================

  useEffect(() => {
    if (!isTravelOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsTravelOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTravelOpen]);


  // =============================================
  // Fetch Flights (tries multiple airports as fallback)
  // =============================================

  async function fetchFlightsWithFallbacks(departureIata, arrivalIataList, departDate, returnDateISO, stayNights) {
    for (const arrivalIata of arrivalIataList) {
      try {
        const response = await axios.get('/api/travel/flights', {
          params: {
            from: departureIata,
            arrivalId: arrivalIata,
            outboundDate: departDate,
            returnDate: returnDateISO,
            stayNights: Math.max(1, stayNights || 1),
          },
        });

        const flightData = response.data;

        // If we found flights at this airport, use it
        if (hasAnyFlights(flightData)) {
          setFlightResponse(flightData);
          setResolvedArrivalIata(arrivalIata);

          // Let the user know if we used a fallback airport
          const wasFirstChoice = (arrivalIataList[0] === arrivalIata);
          if (!wasFirstChoice) {
            pushToast({ title: `Using nearby airport: ${arrivalIata}`, tone: 'info' });
          }

          return true;
        }
      } catch {
        // This airport didn't work, try the next one
      }
    }

    // None of the airports had flights
    setFlightResponse({ error: 'No flights found for nearby airports' });
    setResolvedArrivalIata(arrivalIataList[0] || '');
    return false;
  }


  // =============================================
  // Fetch Hotels
  // =============================================

  async function fetchHotels(city, venue) {
    try {
      const searchQuery = venue
        ? `hotels near ${venue} ${city}`
        : `hotels in ${city}`;

      const response = await axios.get('/api/travel/hotels', {
        params: {
          q: searchQuery,
          city: city,
          venue: venue,
        },
      });

      // The API response format varies, so try multiple fields
      const rawData = response.data;
      const hotelList = Array.isArray(rawData)
        ? rawData
        : (rawData?.localResults || rawData?.results || rawData?.places || rawData?.data || []);

      setHotelResults(Array.isArray(hotelList) ? hotelList : []);
    } catch {
      setHotelResults([]);
    }
  }


  // =============================================
  // Open the Travel Modal for an event
  // =============================================

  function fallbackDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().slice(0, 10);
  }

  async function openEventTravel(event) {
    // Reset all state for the new event
    setActiveEvent(event);
    setIsTravelOpen(true);
    setFlightResponse(null);
    setHotelResults([]);
    setResolvedArrivalIata('');
    setSelectedFlightIndex(null);
    setSelectedHotelIndex(null);
    setIsFlightsLoading(true);
    setIsHotelsLoading(true);

    // Resolve travel dates (fallback: 2 weeks from today, 1-night stay)
    const dates = getEventTravelDates(event);
    const departDate = dates.departISO || fallbackDate(14);
    const returnDateISO = dates.returnISO || fallbackDate(15);

    setOutboundDate(departDate);
    setReturnDate(returnDateISO);

    const city = event?.city || '';
    const venue = event?.venue || '';

    // Fetch hotels first (usually faster)
    await fetchHotels(city, venue);
    setIsHotelsLoading(false);

    // Resolve destination airport(s)
    const manualArrival = (arrivalOverride || '').trim().toUpperCase();
    const arrivalAirports = manualArrival
      ? [manualArrival]
      : await resolveCityToIataList(city);

    const departureAirport = originIata || 'RIX';
    await fetchFlightsWithFallbacks(departureAirport, arrivalAirports, departDate, returnDateISO, 1);
    setIsFlightsLoading(false);
  }


  // =============================================
  // Save Trip (bookmark it)
  // =============================================

  async function saveTrip(formEvent) {
    formEvent.preventDefault();

    // Must be logged in
    if (!userId) {
      pushToast({ title: 'Please sign in first', tone: 'warn' });
      return;
    }

    // Prepare the flight and hotel options
    const allFlightOptions = extractFlightOptions(flightResponse)
      .map(normalizeFlightOption)
      .slice(0, 10);

    const allHotelOptions = (Array.isArray(hotelResults) ? hotelResults : [])
      .map(normalizeHotel);

    // Helper: check if an index is valid for an array
    function isValidIndex(index, array) {
      return Number.isInteger(index) && index >= 0 && index < array.length;
    }

    // Get the user's selected flight and hotel
    const chosenFlight = isValidIndex(selectedFlightIndex, allFlightOptions)
      ? allFlightOptions[selectedFlightIndex]
      : null;

    const chosenHotel = isValidIndex(selectedHotelIndex, allHotelOptions)
      ? allHotelOptions[selectedHotelIndex]
      : null;

    // Must select at least something
    if (!chosenFlight && !chosenHotel) {
      pushToast({ title: 'Select a flight or hotel first', tone: 'warn' });
      return;
    }

    // Build the trip data to save
    const tripData = {
      title: suggestTripTitle(activeEvent, resolvedArrivalIata) || 'My Trip',
      flights: chosenFlight ? [chosenFlight] : [],
      hotels: chosenHotel ? [chosenHotel] : [],
      user_id: userId,
    };

    setIsSavingTrip(true);

    // Store a toast message in sessionStorage so the Bookmarks page can show it
    try {
      const toastForBookmarksPage = {
        title: resolvedArrivalIata ? `Trip saved! Arrival: ${resolvedArrivalIata}` : 'Trip saved!',
        tone: 'success',
      };
      sessionStorage.setItem('toastRelay', JSON.stringify(toastForBookmarksPage));
    } catch {
      // sessionStorage might not be available
    }

    // Send the trip to the server and redirect to Bookmarks
    router.post('/bookmarks', tripData, {
      preserveScroll: true,

      onSuccess: () => {
        router.visit('/bookmarks', { replace: true });
      },

      onError: () => {
        try {
          sessionStorage.removeItem('toastRelay');
        } catch {
          // ignore
        }
        pushToast({ title: 'Failed to save trip', tone: 'error' });
      },

      onFinish: () => {
        setIsSavingTrip(false);
      },
    });
  }


  // =============================================
  // Close the modal
  // =============================================

  function closeTravelModal() {
    setIsTravelOpen(false);
  }


  // =============================================
  // Return everything the Dashboard needs
  // =============================================

  return {
    // Modal
    activeEvent,
    isTravelOpen,
    modalRef,
    openEventTravel,
    closeTravelModal,

    // Flights
    flightResponse,
    resolvedArrivalIata,
    arrivalOverride,
    setArrivalOverride,
    isFlightsLoading,

    // Hotels
    hotelResults,
    isHotelsLoading,

    // Dates
    outboundDate,
    returnDate,

    // Selections
    selectedFlightIndex, setSelectedFlightIndex,
    selectedHotelIndex, setSelectedHotelIndex,

    // Save
    isSavingTrip,
    saveTrip,
  };
}
