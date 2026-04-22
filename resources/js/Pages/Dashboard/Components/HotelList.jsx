import React from 'react';
import { normalizeHotel, join, fmtInt, mapsLinkFromHotel } from '../utils';

/**
 * Renders a list of hotel options as selectable cards.
 * Each card shows thumbnail, name, rating, address, and action links.
 */
export default function HotelList({ hotels, selectedHotel, setSelectedHotel }) {

  // Handle empty state
  if (!hotels) {
    return <div className="muted">No hotels loaded yet.</div>;
  }

  // Normalize the raw hotel data into a clean format
  const hotelList = (Array.isArray(hotels) ? hotels : []).map(normalizeHotel);

  if (hotelList.length === 0) {
    return <div className="muted">No hotels found near this venue.</div>;
  }

  // Show at most 12 hotels
  const visibleHotels = hotelList.slice(0, 12);

  return (
    <div className="cards-stack">
      {visibleHotels.map((hotel, index) => (
        <HotelCard
          key={index}
          hotel={hotel}
          index={index}
          isSelected={selectedHotel === index}
          onSelect={() => setSelectedHotel(index)}
        />
      ))}
    </div>
  );
}


/**
 * A single hotel card with radio button selection.
 */
function HotelCard({ hotel, index, isSelected, onSelect }) {
  const hasRating = typeof hotel.rating === 'number';
  const hasReviews = typeof hotel.reviews === 'number';
  const hasTags = hotel.tags?.length > 0;
  const mapsLink = mapsLinkFromHotel(hotel);

  return (
    <label className="card hotel-card">
      {/* Radio button for selection */}
      <input
        type="radio"
        name="hotels-select"
        className="radio-select"
        checked={isSelected}
        onChange={onSelect}
      />

      <div className="hotel-grid">
        <div className="thumb-wrap">
          {hotel.thumbnail ? (
            <img
              className="hotel-thumb"
              src={hotel.thumbnail}
              alt={hotel.title}
              loading="lazy"
            />
          ) : (
            <div className="hotel-thumb placeholder" aria-hidden="true" />
          )}
        </div>

        {/* Hotel info */}
        <div className="hotel-info">

          {/* Name + star rating */}
          <div className="hotel-title-row">
            <div className="hotel-title">
              {hotel.website ? (
                <a href={hotel.website} target="_blank" rel="noreferrer" className="card-link">
                  {hotel.title}
                </a>
              ) : (
                hotel.title
              )}
            </div>

            {(hotel.stars || hotel.type) && (
              <div className="muted small">
                {join([hotel.type, hotel.stars ? `${hotel.stars}★` : ''])}
              </div>
            )}
          </div>

          {/* User rating + review count */}
          {(hasRating || hasReviews) && (
            <div className="rating-row">
              {hasRating && <span className="star">★</span>}
              {hasRating && <span className="rating">{hotel.rating.toFixed(1)}</span>}
              {hasReviews && <span className="muted small">({fmtInt(hotel.reviews)} reviews)</span>}
            </div>
          )}

          {/* Address */}
          {hotel.address && (
            <div className="muted small">{hotel.address}</div>
          )}

          {/* Tags (e.g. "Free Wi-Fi", "Pool") */}
          {hasTags && (
            <div className="chip-row">
              {hotel.tags.slice(0, 4).map((tag, tagIndex) => (
                <span className="chip" key={tagIndex}>{tag}</span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="actions-row">
            <a className="btn small" href={mapsLink} target="_blank" rel="noreferrer">
              Maps
            </a>

            {hotel.website && (
              <a className="btn small" href={hotel.website} target="_blank" rel="noreferrer">
                Website
              </a>
            )}

            {hotel.phone && (
              <a className="btn small" href={`tel:${hotel.phone.replace(/\s+/g, '')}`}>
                Call
              </a>
            )}
          </div>

        </div>
      </div>
    </label>
  );
}
