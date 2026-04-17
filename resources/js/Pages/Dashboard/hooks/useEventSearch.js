import { useState, useRef } from 'react';
import axios from 'axios';
import { DEFAULT_GL, DEFAULT_HL, DEFAULT_EVENT_LOCATION, normalizeEvents } from '../utils';

/**
 * Handles searching for events via the API.
 * Manages search term, location, date filter, and results.
 */
export default function useEventSearch(pushToast) {

  // --- Search input state ---
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [whenFilter, setWhenFilter] = useState('');

  // --- Results state ---
  const [eventResults, setEventResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchTerm, setLastSearchTerm] = useState('');

  // Holds the AbortController for the current in-flight request
  const abortControllerRef = useRef(null);

  /**
   * Main search function.
   *
   * @param {object} overrides - optional overrides for search params
   */
  async function searchEvents(overrides = {}) {
    const term = (overrides.searchTerm ?? searchTerm ?? '').trim();
    const dateFilter = overrides.whenFilter ?? whenFilter;
    const location = overrides.locationFilter ?? (locationFilter || DEFAULT_EVENT_LOCATION);

    if (!term) {
      pushToast({ title: 'Type something to search', tone: 'warn' });
      return;
    }

    setLastSearchTerm(term);
    setHasSearched(true);
    setEventResults([]);

    // Abort any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);

    try {
      const { data } = await axios.get('/api/events', {
        params: {
          q: term,
          location: location,
          when: dateFilter,
          gl: DEFAULT_GL,
          hl: DEFAULT_HL,
        },
        signal: controller.signal,
      });

      setEventResults(normalizeEvents(data));
    } catch (error) {
      if (axios.isCancel(error)) return;
      const errorMessage = error?.response?.data?.error || error?.message || 'Search failed';
      pushToast({ title: errorMessage, tone: 'error' });
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  }

  /**
   * Quick search from the landing page chips.
   */
  async function runQuickSearch(term = '', dateFilter = '', city = '') {
    const location = city ? `${city}, ${DEFAULT_EVENT_LOCATION}` : DEFAULT_EVENT_LOCATION;

    setSearchTerm(term);
    setWhenFilter(dateFilter || '');
    setLocationFilter(city ? location : '');

    await searchEvents({
      searchTerm: term,
      whenFilter: dateFilter || '',
      locationFilter: location,
    });
  }

  /**
   * Clear everything and go back to the landing state.
   */
  function clearSearch() {
    setSearchTerm('');
    setLocationFilter('');
    setWhenFilter('');
    setEventResults([]);
    setHasSearched(false);
    setLastSearchTerm('');
  }

  return {
    // State
    searchTerm, setSearchTerm,
    locationFilter, setLocationFilter,
    whenFilter, setWhenFilter,
    eventResults,
    isSearching,
    hasSearched,
    lastSearchTerm,

    // Actions
    searchEvents,
    runQuickSearch,
    clearSearch,
  };
}
