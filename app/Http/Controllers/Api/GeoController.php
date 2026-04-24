<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GroqClient;
use Illuminate\Http\Request;

class GeoController extends Controller
{
    public function airports(Request $request, GroqClient $groq)
    {
        $label = trim((string) $request->input('cityLabel', ''));
        if ($label === '') {
            return response()->json(['codes' => []]);
        }

        try {
            $codes = $groq->resolveAirports($label);
        } catch (\Throwable $e) {
            \Log::warning('GeoController::airports failed', [
                'label'   => $label,
                'message' => $e->getMessage(),
            ]);
            $codes = [];
        }

        return response()->json(['codes' => $codes]);
    }
}
