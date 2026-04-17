<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GroqClient
{
    private string $apiKey;

    private string $baseUrl = 'https://api.groq.com/openai/v1';

    public function __construct()
    {
        $this->apiKey = (string) config('services.groq.api_key', '');
    }

    public function resolveAirports(string $location): array
    {
        $systemPrompt = 'You are an airport code resolver. Given a location, return the IATA codes of the nearest major airports. Return ONLY a JSON array of strings, nothing else. Example: ["CPT","JNB"]. Return 3-5 codes, ordered by proximity. Only include real, active airports with commercial flights.';

        $userMessage = "Nearest major airports to: {$location}";

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type' => 'application/json',
        ])->timeout(10)->post("{$this->baseUrl}/chat/completions", [
            'model' => 'llama-3.3-70b-versatile',
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userMessage],
            ],
            'temperature' => 0,
            'max_tokens' => 100,
        ]);

        $responseContent = $response->json('choices.0.message.content', '');

        return $this->extractAirportCodes($responseContent);
    }

    private function extractAirportCodes(string $content): array
    {
        // LLM may wrap the JSON array in surrounding text, so extract it with regex
        if (!preg_match('/\[.*?\]/s', $content, $matches)) {
            return [];
        }

        $codes = json_decode($matches[0], true);
        if (!is_array($codes)) {
            return [];
        }

        // Only keep valid 3-letter uppercase IATA codes
        $validCodes = [];
        foreach ($codes as $code) {
            if (is_string($code) && preg_match('/^[A-Z]{3}$/', $code)) {
                $validCodes[] = $code;
            }
        }
        return $validCodes;
    }
}
