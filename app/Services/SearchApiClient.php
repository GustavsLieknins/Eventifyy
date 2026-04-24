<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SearchApiClient
{
    private const BASE_URL = 'https://www.searchapi.io/api/v1';
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = (string) config('services.searchapi.base_url', self::BASE_URL);
        $this->apiKey = (string) config('services.searchapi.key', '');

        if ($this->apiKey === '') {
            throw new \RuntimeException('SearchAPI key is not configured (services.searchapi.key).');
        }
    }

    private function get(string $endpoint, array $params): array // Sagatavo vaicājumu
    {
        $params['api_key'] = $this->apiKey;

        return Http::baseUrl($this->baseUrl)
            ->timeout(30)
            ->get($endpoint, $params)
            ->throw()
            ->json();
    }

    public function events(array $params): array // Pasākumu vaicāšanas loģika
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
