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
  const [resultStart, setResultStart] = useState(0);

  // Holds the AbortController for the current in-flight request
  const abortControllerRef = useRef(null);

  // Clear results and reset pagination
  function resetResults() {
    setEventResults([]);
    setResultStart(0);
  }

  /**
   * Main search function.
   *
   * @param {boolean} isNewSearch - true = fresh search, false = "load more"
   * @param {object} overrides - optional overrides for search params
   */
  async function searchEvents(isNewSearch = true, overrides = {}) {
    // Figure out what to search for (use overrides or current state)
    const term = (overrides.searchTerm ?? searchTerm ?? '').trim();
    const dateFilter = overrides.whenFilter ?? whenFilter;
    const location = overrides.locationFilter ?? (locationFilter || DEFAULT_EVENT_LOCATION);
    const startIndex = isNewSearch ? 0 : (overrides.start ?? resultStart);

    // Don't search if there's nothing to search for
    if (!term) {
      pushToast({ title: 'Type something to search', tone: 'warn' });
      return;
    }

    // Update UI state
    setLastSearchTerm(term);
    setHasSearched(true);

    if (isNewSearch) {
      resetResults();
    }

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
          start: startIndex,
        },
        signal: controller.signal,
      });

      const newEvents = normalizeEvents(data);

      if (isNewSearch) {
        // Replace all results
        setEventResults(newEvents);
      } else {
        // Append only events we don't already have (deduplicate by title)
        setEventResults((previousEvents) => {
          const existingTitles = new Set(previousEvents.map((event) => event.title));
          const uniqueNewEvents = newEvents.filter((event) => !existingTitles.has(event.title));

          if (uniqueNewEvents.length === 0) {
            pushToast({ title: 'No more results', tone: 'info' });
          }

          return [...previousEvents, ...uniqueNewEvents];
        });
      }
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
   * Sets the inputs and immediately fires a search.
   */
  async function runQuickSearch(term = '', dateFilter = '', city = '') {
    const location = city ? `${city}, ${DEFAULT_EVENT_LOCATION}` : DEFAULT_EVENT_LOCATION;

    setSearchTerm(term);
    setWhenFilter(dateFilter || '');
    setLocationFilter(city ? location : '');

    await searchEvents(true, {
      searchTerm: term,
      whenFilter: dateFilter || '',
      locationFilter: location,
    });
  }

  /**
   * Load more results (pagination).
   * Fetches the next page of results and appends them.
   */
  async function loadMore() {
    const nextStart = resultStart + 10;
    setResultStart(nextStart);
    await searchEvents(false, { start: nextStart });
  }

  /**
   * Clear everything and go back to the landing state.
   */
  function clearSearch() {
    setSearchTerm('');
    setLocationFilter('');
    setWhenFilter('');
    resetResults();
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
    loadMore,
    clearSearch,
  };
}
