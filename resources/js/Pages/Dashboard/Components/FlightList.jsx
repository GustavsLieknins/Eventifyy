import React from 'react';
import {
  extractFlightOptions,
  normalizeFlightOption,
  fmtDuration,
  fmtInt,
  fmtDateTimeSimple,
  inferCurrencySymbol,
} from '../utils';

/**
 * Renders a list of flight options as selectable cards.
 * Each card shows route, price, timing, airlines, and emissions.
 */
export default function FlightList({ data, selectedFlight, setSelectedFlight }) {

  if (data === null) {
    return <div className="muted">No flights loaded yet.</div>;
  }

  if (data?.error) {
    return <div className="error">Warning: {data.error}</div>;
  }

  const flightOptions = extractFlightOptions(data)
    .map(normalizeFlightOption)
    .slice(0, 10);

  const currencySymbol = inferCurrencySymbol(data);
  const googleFlightsLink = data?.requestMetadata?.url;

  // No flights found
  if (flightOptions.length === 0) {
    return (
      <div className="muted">
        No flights found. Try changing dates or arrival IATA.
        {googleFlightsLink && (
          <>
            {' '}
            <a className="inline-link" href={googleFlightsLink} target="_blank" rel="noreferrer">
              Open in Google Flights
            </a>.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="cards-stack">
      {flightOptions.map((flight, index) => (
        <FlightCard
          key={index}
          flight={flight}
          index={index}
          isSelected={selectedFlight === index}
          onSelect={() => setSelectedFlight(index)}
          currencySymbol={currencySymbol}
          googleFlightsLink={googleFlightsLink}
        />
      ))}
    </div>
  );
}


/**
 * A single flight option card with radio button selection.
 */
function FlightCard({ flight, index, isSelected, onSelect, currencySymbol, googleFlightsLink }) {
  const hasPrice = typeof flight.price === 'number';
  const hasEmissions = flight.emissions?.differencePercent != null || flight.emissions?.thisFlight != null;

  return (
    <label className="card flight-card">
      {/* Radio button for selection */}
      <input
        type="radio"
        name="flight-select"
        className="radio-select"
        checked={isSelected}
        onChange={onSelect}
      />

      {/* Route + Price header */}
      <div className="card-head">
        <div className="route">
          <span className="iata">{flight.fromId || '---'}</span>
          <span className="arrow">→</span>
          <span className="iata">{flight.toId || '---'}</span>
        </div>

        {hasPrice && (
          <div className="price-badge">
            {currencySymbol}{fmtInt(flight.price)}
          </div>
        )}
      </div>

      {/* Badges: type, class, duration, airlines */}
      <div className="meta-row">
        {flight.type && <span className="badge">{flight.type}</span>}
        {flight.travelClass && <span className="badge">{flight.travelClass}</span>}
        {flight.totalDuration > 0 && <span className="badge">{fmtDuration(flight.totalDuration)}</span>}
        {flight.airlines?.length > 0 && <span className="badge">{flight.airlines.join(' + ')}</span>}
      </div>

      {/* Departure and arrival times */}
      <div className="timing">
        <div className="time-col">
          <div className="time">{fmtDateTimeSimple(flight.depart)}</div>
          <div className="muted small">{flight.fromName || 'Departure'}</div>
        </div>
        <div className="time-col">
          <div className="time">{fmtDateTimeSimple(flight.arrive)}</div>
          <div className="muted small">{flight.toName || 'Arrival'}</div>
        </div>
      </div>

      {/* Flight numbers */}
      {flight.flightNumbers?.length > 0 && (
        <div className="muted small">
          Flight: {flight.flightNumbers.join(', ')}
        </div>
      )}

      {/* Emissions info */}
      {hasEmissions && (
        <div className="emissions-row">
          {typeof flight.emissions.differencePercent === 'number' && (
            <span
              className={`badge ${flight.emissions.differencePercent <= 0 ? 'green' : 'red'}`}
              title="Compared to typical for this route"
            >
              {flight.emissions.differencePercent > 0 ? '+' : ''}
              {flight.emissions.differencePercent}% vs typical
            </span>
          )}

          {typeof flight.emissions.thisFlight === 'number' && (
            <span className="muted small">
              Est. {Math.round(flight.emissions.thisFlight / 1000)} kg CO2
            </span>
          )}
        </div>
      )}

      {/* Link to Google Flights */}
      {googleFlightsLink && (
        <div className="actions-row">
          <a className="btn small" href={googleFlightsLink} target="_blank" rel="noreferrer">
            Open in Google Flights
          </a>
        </div>
      )}
    </label>
  );
}
