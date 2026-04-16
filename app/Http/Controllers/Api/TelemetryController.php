<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VisitLog;
use Illuminate\Http\Request;

class TelemetryController extends Controller
{
    public function visit(Request $request)
    {
        VisitLog::create([
            'user_id' => $request->user()?->id,
            'path' => (string) $request->input('path', $request->path()),
            'referrer' => (string) $request->input('referrer', $request->headers->get('Referer')),
            'country' => $this->countryFromRequest($request),
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1024),
            'meta' => $request->input('meta', null),
            'lat' => $request->input('lat'),
            'lng' => $request->input('lng'),
            'city' => $request->input('city'),
            'region' => $request->input('region'),
        ]);

        return response()->json(['ok' => true]);
    }

    private function countryFromRequest(Request $request): ?string
    {
        foreach (['CF-IPCountry', 'X-Country-Code', 'X-Geo-Country', 'X-App-Country'] as $header) {
            $value = $request->headers->get($header);
            if ($value && strlen($value) === 2) {
                return strtoupper($value);
            }
        }

        $param = (string) $request->input('country', '');

        return ($param && strlen($param) === 2) ? strtoupper($param) : null;
    }
}
