import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import TopNav from '@/Shared/TopNav';
import { usePage } from '@inertiajs/react';

import Toasts from './Components/Toasts';
import SearchHeader from './Components/SearchHeader';
import EventCard from './Components/EventCard';
import EventCardSkeleton from './Components/EventCardSkeleton';
import TravelModal from './Components/TravelModal';

import useVisitBeacon from '@/Shared/useVisitBeacon';
import useToasts from './hooks/useToasts';
import useEventSearch from './hooks/useEventSearch';
import useEventTravel from './hooks/useEventTravel';
import { guessOriginIata } from './utils';

/**
 * Main Dashboard page.
 * Shows a search bar, event results, and a travel modal.
 */
export default function Dashboard() {
  useVisitBeacon();

  // Get the logged-in user (if any)
  const { auth } = usePage().props;
  const userId = auth?.user?.id ?? null;

  // Detect user's nearest airport (defaults to Riga)
  const [originIata, setOriginIata] = useState('RIX');

  // Custom hooks for toasts, search, and travel
  const { toasts, pushToast, dismissToast } = useToasts();
  const search = useEventSearch(pushToast);
  const travel = useEventTravel(pushToast, originIata, userId);

  // Try to detect the user's origin airport on page load
  useEffect(() => {
    let isActive = true;

    guessOriginIata('RIX').then((iata) => {
      if (isActive) {
        setOriginIata(iata || 'RIX');
      }
    });

    return () => { isActive = false; };
  }, []);

  // Show the landing page (suggestions) when user hasn't searched yet
  const showLanding =
    !search.isSearching &&
    search.eventResults.length === 0 &&
    !search.hasSearched &&
    !search.lastSearchTerm;

  // Handle search form submission
  function handleSearchSubmit(event, currentSearchTerm) {
    event.preventDefault();

    const trimmedTerm = (currentSearchTerm ?? search.searchTerm ?? '').trim();

    if (!trimmedTerm) {
      pushToast({ title: 'Type something to search', tone: 'warn' });
      return;
    }

    search.setSearchTerm(trimmedTerm);
    search.searchEvents(true, { searchTerm: trimmedTerm });
  }

  // CSS classes for the main wrapper
  const wrapperClasses = [
    'main-wrapper',
    search.hasSearched ? 'search-active' : '',
    showLanding ? 'landing' : '',
  ].join(' ');

  return (
    <>
      <TopNav active="dashboard" />

      <div className={wrapperClasses}>
        <Toasts toasts={toasts} onDismiss={dismissToast} />

        {/* Search bar + landing suggestions */}
        <SearchHeader
          q={search.searchTerm}
          setQ={search.setSearchTerm}
          location={search.locationFilter}
          setLocation={search.setLocationFilter}
          when={search.whenFilter}
          setWhen={search.setWhenFilter}
          loading={search.isSearching}
          showSuggestions={showLanding}
          onSubmitSearch={handleSearchSubmit}
          onClear={search.clearSearch}
          runQuickSearch={search.runQuickSearch}
        />

        {/* Search results area */}
        <main className="results-area">
          {!showLanding && (
            <>
              {/* Loading skeletons */}
              {search.isSearching && search.eventResults.length === 0 && (
                <div className="cards-stack">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <EventCardSkeleton key={index} />
                  ))}
                </div>
              )}

              {/* "No results" message */}
              {!search.isSearching && search.eventResults.length === 0 && (search.hasSearched || search.lastSearchTerm) && (
                <div className="muted center">
                  No events found{search.lastSearchTerm ? ` for "${search.lastSearchTerm}"` : ''}.
                </div>
              )}

              {/* Event cards */}
              {search.eventResults.map((event, index) => (
                <EventCard
                  key={index}
                  evt={event}
                  onSelect={() => travel.openEventTravel(event)}
                />
              ))}
            </>
          )}
        </main>

        {/* Travel modal (flights + hotels) */}
        {travel.isTravelOpen && travel.activeEvent && (
          <TravelModal
            selected={travel.activeEvent}
            flights={travel.flightResponse}
            hotels={travel.hotelResults}
            selectedFlight={travel.selectedFlightIndex}
            setSelectedFlight={travel.setSelectedFlightIndex}
            selectedHotel={travel.selectedHotelIndex}
            setSelectedHotel={travel.setSelectedHotelIndex}
            saving={travel.isSavingTrip}
            handleSave={travel.saveTrip}
            onClose={travel.closeTravelModal}
            modalRef={travel.modalRef}
            flightsLoading={travel.isFlightsLoading}
            hotelsLoading={travel.isHotelsLoading}
          />
        )}
      </div>
    </>
  );
}
