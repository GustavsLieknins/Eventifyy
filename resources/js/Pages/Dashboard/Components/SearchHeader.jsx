import React from 'react';

// Quick search chip data (kept here so it's easy to edit)
const ARTIST_CHIPS = ['Korn', 'Lady Gaga', 'Morgenshtern', 'Linkin Park'];

const DATE_CHIPS = [
  { label: 'Today', value: 'date:today' },
  { label: 'This Weekend', value: 'date:weekend' },
  { label: 'Next Week', value: 'date:next_week' },
];

const CITY_CHIPS = ['London', 'Riga', 'Stockholm', 'Manchester'];

const GENRE_CHIPS = ['rock', 'pop', 'stand-up', 'festival'];

/**
 * Search bar + landing page suggestions.
 * When showSuggestions is true, displays quick-search chips below the form.
 */
export default function SearchHeader({
  q,
  setQ,
  location,
  setLocation,
  when,
  setWhen,
  loading,
  showSuggestions,
  onSubmitSearch,
  onClear,
  runQuickSearch,
}) {
  return (
    <header className={`search-header ${showSuggestions ? 'is-landing' : ''}`}>
      <div className="search-inner">
        <h1 className="app-name-title">Eventify</h1>

        {/* Search form */}
        <form
          className="actions-wrapper"
          onSubmit={(event) => onSubmitSearch?.(event, q)}
        >
          <div className="input-group">
            {/* Main search input */}
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search artists, venues, genres..."
              className="input-search"
              aria-label="Search query"
              name="SearchQuery"
            />

            {/* Hidden location field */}
            <input
              type="hidden"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />

            {/* Date filter dropdown */}
            <select
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              className="input-when"
              aria-label="When"
            >
              <option value="">When</option>
              <option value="">Anytime</option>
              <option value="date:today">Today</option>
              <option value="date:tomorrow">Tomorrow</option>
              <option value="date:week">This Week</option>
              <option value="date:weekend">This Weekend</option>
              <option value="date:next_week">Next Week</option>
              <option value="date:month">This Month</option>
              <option value="date:next_month">Next Month</option>
              <option value="event_type:Virtual-Event">Online</option>
            </select>
          </div>

          {/* Search + Clear buttons */}
          <div className="actions-buttons">
            <button
              type="submit"
              className="btn primary"
              disabled={loading}
              aria-busy={loading ? 'true' : 'false'}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>

            <button type="button" className="btn" onClick={onClear} disabled={loading}>
              Clear
            </button>
          </div>
        </form>

        {/* Landing page: quick search suggestions */}
        {showSuggestions && (
          <section className="landing-suggest in-header">
            <div className="suggest-wrap">

              {/* Hero text */}
              <div className="suggest-hero">
                <div className="hero-eyebrow">Getting started</div>
                <h2 className="hero-title">Search concerts & events</h2>
                <p className="hero-sub">Pick a quick chip or just type above.</p>
              </div>

              {/* Artist chips */}
              <div className="chip-row big mb-14">
                {ARTIST_CHIPS.map((artistName) => (
                  <button
                    key={artistName}
                    className="chip chip--pill chip--ghost chip--lg"
                    onClick={() => runQuickSearch?.(artistName, '')}
                    type="button"
                  >
                    {artistName}
                  </button>
                ))}
              </div>

              {/* Suggestion cards grid */}
              <div className="suggest-grid">

                {/* By date */}
                <div className="suggest-card">
                  <div className="suggest-head">By date</div>
                  <div className="chip-row">
                    {DATE_CHIPS.map(({ label, value }) => (
                      <button
                        key={value}
                        className="chip chip--pill chip--ghost"
                        onClick={() => runQuickSearch?.(q || 'concert', value)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="hint">Sets the "When" filter for you.</div>
                </div>

                {/* By city */}
                <div className="suggest-card">
                  <div className="suggest-head">Cities</div>
                  <div className="chip-row">
                    {CITY_CHIPS.map((cityName) => (
                      <button
                        key={cityName}
                        className="chip chip--pill chip--ghost"
                        onClick={() => runQuickSearch?.('concert', '', cityName)}
                        type="button"
                      >
                        {cityName}
                      </button>
                    ))}
                  </div>
                  <div className="hint">Searches events around the city.</div>
                </div>

                {/* By genre */}
                <div className="suggest-card">
                  <div className="suggest-head">Ideas</div>
                  <div className="chip-row">
                    {GENRE_CHIPS.map((genre) => (
                      <button
                        key={genre}
                        className="chip chip--pill chip--ghost"
                        onClick={() => runQuickSearch?.(genre)}
                        type="button"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                  <div className="hint">Quick genre kicks to get you going.</div>
                </div>

              </div>
            </div>
          </section>
        )}
      </div>
    </header>
  );
}
