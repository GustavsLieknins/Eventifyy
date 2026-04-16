<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SearchApiClient;
use App\Services\TravelService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TravelController extends Controller
{
    public function flights(Request $request, SearchApiClient $searchApi, TravelService $travel)
    {
        $from = strtoupper((string) $request->input('from', config('services.travel.default_departure_iata', 'RIX')));
        $arrivalId = strtoupper(trim((string) $request->input('arrivalId', '')));

        if (! $arrivalId) {
            return response()->json(['error' => 'No destination provided'], 422);
        }

        $dates = $travel->resolveFlightDates(
            $request->input('outboundDate'),
            $request->input('returnDate'),
            $request->input('date'),
            (int) $request->input('stayNights', 1)
        );

        try {
            $data = $searchApi->flights([
                'departure_id' => $from,
                'arrival_id' => $arrivalId,
                'outbound_date' => $dates['outbound_date'],
                'return_date' => $dates['return_date'],
                'currency' => config('services.travel.default_currency', 'EUR'),
                'hl' => config('services.travel.google_hl', 'en'),
            ]);

            return response()->json([
                'bestFlights' => $data['best_flights'] ?? [],
                'otherFlights' => $data['other_flights'] ?? [],
                'priceInsights' => $data['price_insights'] ?? null,
                'airports' => $data['airports'] ?? [],
            ]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Failed to fetch flights'], 500);
        }
    }

    public function hotels(Request $request, SearchApiClient $searchApi, TravelService $travel)
    {
        $city = trim((string) $request->input('city', ''));
        $venue = trim((string) $request->input('venue', ''));

        if (! $city && ! $venue) {
            return response()->json([]);
        }

        $q = $venue ? "hotels near {$venue} {$city}" : "hotels in {$city}";

        try {
            $data = $searchApi->hotels([
                'q' => $q,
                'check_in_date' => Carbon::today()->addDays(14)->format('Y-m-d'),
                'check_out_date' => Carbon::today()->addDays(16)->format('Y-m-d'),
                'hl' => 'en',
            ]);

            $properties = $data['properties'] ?? [];

            return response()->json(
                array_map([$travel, 'normalizeHotelResult'], $properties)
            );
        } catch (\Throwable) {
            return response()->json(['error' => 'Failed to fetch hotels'], 500);
        }
    }
}
