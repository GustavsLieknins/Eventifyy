<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SearchLog;
use App\Services\SearchApiClient;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function search(Request $request, SearchApiClient $searchApi)
    {
        $query = trim((string) $request->input('q', ''));

        if ($query === '') {
            return response()->json(['error' => 'q is required'], 422);
        }

        $countryCode = $this->normalizeCountryCode($request->input('gl', 'uk'));
        $language = strtolower($request->input('hl', 'en'));

        $params = [
            'q' => $query,
            'location' => $request->input('location', ''),
            'gl' => $countryCode,
            'hl' => $language,
        ];

        if ($request->filled('when')) {
            $params['htichips'] = $request->input('when');
        }

        SearchLog::query()->create([
            'user_id' => $request->user()?->id,
            'query' => $query,
            'ip' => $request->ip(),
        ]);

        try {
            $results = $searchApi->events($params);

            $results = $this->normalizeEventKeys($results);

            return response()->json($results);
        } catch (\Throwable) {
            return response()->json(['error' => 'Search failed'], 500);
        }
    }

    /**
     * Normalize country code: SearchAPI expects ISO 3166-1 alpha-2,
     * but 'uk' is commonly passed instead of the correct 'gb'.
     */
    private function normalizeCountryCode(string $countryCode): string
    {
        $countryCode = strtolower($countryCode);

        return ($countryCode === 'uk') ? 'gb' : $countryCode;
    }

    /**
     * Remap SearchAPI's events_results key to the camelCase eventsResults
     * that the frontend expects. Also handle the rare 'events' key as a safety fallback.
     */
    private function normalizeEventKeys(array $results): array
    {
        if (isset($results['events_results']) && ! isset($results['eventsResults'])) {
            $results['eventsResults'] = $results['events_results'];
        }

        if (isset($results['events']) && ! isset($results['eventsResults'])) {
            $results['eventsResults'] = $results['events'];
        }

        return $results;
    }
}
