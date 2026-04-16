<?php

namespace App\Services;

use Illuminate\Support\Carbon;

class TravelService
{
    public function resolveFlightDates(
        ?string $outboundDate,
        ?string $returnDate,
        ?string $eventDate,
        int $stayNights
    ): array {
        $today = Carbon::today();
        $stayNights = max(1, $stayNights);

        // Step 1: Figure out outbound date
        if (!$outboundDate) {
            if ($eventDate && Carbon::parse($eventDate)->greaterThan($today)) {
                // Day before the event
                $outboundDate = Carbon::parse($eventDate)->subDay()->format('Y-m-d');
            } else {
                // No usable event date -- default to 14 days from now
                $outboundDate = $today->copy()->addDays(14)->format('Y-m-d');
            }
        }

        // Step 2: Figure out return date
        if (!$returnDate) {
            $returnDate = Carbon::parse($outboundDate)->addDays($stayNights)->format('Y-m-d');
        }

        // Step 3: If outbound is in the past, push both dates forward
        if (Carbon::parse($outboundDate)->lessThanOrEqualTo($today)) {
            $outboundDate = $today->copy()->addDays(3)->format('Y-m-d');
            $returnDate = Carbon::parse($outboundDate)->addDays($stayNights)->format('Y-m-d');
        }

        return [
            'outbound_date' => $outboundDate,
            'return_date' => $returnDate,
        ];
    }

    public function normalizeHotelResult(array $hotel): array
    {
        $images = $hotel['images'] ?? [];
        $thumbnail = '';
        if (! empty($images)) {
            $thumbnail = $images[0]['thumbnail'] ?? $images[0]['original_image'] ?? '';
        }

        return [
            'title' => $hotel['name'] ?? 'Hotel',
            'thumbnail' => $thumbnail,
            'rating' => $hotel['overall_rating'] ?? null,
            'reviews' => $hotel['reviews'] ?? null,
            'type' => $hotel['type'] ?? 'Hotel',
            'stars' => $hotel['hotel_class'] ?? null,
            'address' => $hotel['address'] ?? '',
            'phone' => $hotel['phone'] ?? '',
            'website' => $hotel['link'] ?? '',
            'gpsCoordinates' => $hotel['gps_coordinates'] ?? null,
            'serviceOptions' => $hotel['amenities'] ?? [],
            'price' => $hotel['price_per_night']['price'] ?? null,
        ];
    }
}
