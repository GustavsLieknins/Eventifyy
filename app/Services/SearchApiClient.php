<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SearchApiClient
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = (string) config('services.searchapi.base_url', 'https://www.searchapi.io/api/v1');
        $this->apiKey = (string) config('services.searchapi.key', '');
    }

    private function get(string $endpoint, array $params): array
    {
        $params['api_key'] = $this->apiKey;

        return Http::baseUrl($this->baseUrl)
            ->timeout(30)
            ->get($endpoint, $params)
            ->throw()
            ->json();
    }

    public function events(array $params): array
    {
        $params['engine'] = 'google_events';

        return $this->get('/search', $params);
    }

    public function flights(array $params): array
    {
        $params['engine'] = 'google_flights';

        return $this->get('/search', $params);
    }

    public function hotels(array $params): array
    {
        $params['engine'] = 'google_hotels';

        return $this->get('/search', $params);
    }
}
