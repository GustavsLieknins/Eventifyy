import React from 'react';

/**
 * Displays a single event as a card.
 * Shows title, date, venue, description, and action buttons.
 */
export default function EventCard({ evt, onSelect }) {
  const { title, when, venue, city, description, link, ticketInfo } = evt;

  // Only show the first 4 ticket links
  const hasTickets = Array.isArray(ticketInfo) && ticketInfo.length > 0;
  const visibleTickets = hasTickets ? ticketInfo.slice(0, 4) : [];

  return (
    <div className="event-card">

      {/* Event title */}
      <div className="event-title">{title}</div>

      {/* Date, venue, city on one line */}
      <div className="event-meta">
        {when}
        {venue && ` • ${venue}`}
        {city && ` • ${city}`}
      </div>

      {/* Description (if available) */}
      {description && (
        <div className="event-desc">{description}</div>
      )}

      {/* Action buttons */}
      <div className="event-actions">
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="btn small"
          >
            Source
          </a>
        )}

        <button onClick={() => onSelect(evt)} className="btn small">
          View travel
        </button>
      </div>

      {/* Ticket links */}
      {visibleTickets.length > 0 && (
        <div className="ticket-row">
          {visibleTickets.map((ticket, index) => (
            <a
              key={index}
              href={ticket.link}
              target="_blank"
              rel="noreferrer noopener"
              className="chip"
            >
              {ticket.source || ticket.seller || ticket.link_type || 'Link'}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
