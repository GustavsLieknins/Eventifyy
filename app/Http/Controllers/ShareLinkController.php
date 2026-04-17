<?php

namespace App\Http\Controllers;

use App\Models\ShareLink;
use App\Models\ShareLinkVisit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ShareLinkController extends Controller
{
    // Common CDN/proxy country headers, in order of preference
    private const COUNTRY_HEADERS = [
        'CF-IPCountry',
        'X-Country-Code',
        'X-Geo-Country',
        'X-App-Country',
    ];

    public function store(Request $request)
    {
        $validated = $request->validate([
            'trip_id' => ['required', 'integer', 'exists:bookmarked_trips,id'],
            'expires_in' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = $request->user();

        $trip = $user->bookmarkedTrips()->findOrFail($validated['trip_id']);

        // Find the most recent share link for this trip
        $existing = ShareLink::query()
            ->where('trip_id', $trip->id)
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->first();

        // Reuse it if it's not expired
        if ($existing && !$existing->isExpired()) {
            return response()->json([
                'url' => route('share.show', $existing->slug),
                'slug' => $existing->slug,
            ]);
        }

        do {
            $slug = Str::lower(Str::random(10));
        } while (ShareLink::where('slug', $slug)->exists());

        $expiresAt = null;
        if (!empty($validated['expires_in'])) {
            $expiresAt = now()->addMinutes((int) $validated['expires_in']);
        }

        $link = ShareLink::create([
            'slug' => $slug,
            'user_id' => $user->id,
            'trip_id' => $trip->id,
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'url' => route('share.show', $link->slug),
            'slug' => $link->slug,
        ]);
    }

    public function show(Request $request, string $slug)
    {
        $link = ShareLink::with('trip')->where('slug', $slug)->firstOrFail();

        if ($link->isExpired()) {
            abort(410, 'This link has expired.');
        }

        \DB::transaction(function () use ($link, $request) {
            ShareLinkVisit::create([
                'share_link_id' => $link->id,
                'user_id' => $request->user()?->id,
                'country' => $this->countryFromRequest($request),
                'ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 1024),
            ]);

            $link->increment('opens');
        });

        $trip = $link->trip;

        return Inertia::render('Bookmarks/SharedTrip', [
            'slug' => $link->slug,
            'title' => $trip->title,
            'trip' => [
                'id' => $trip->id,
                'title' => $trip->title,
                'flights' => $trip->flights ?? [],
                'hotels' => $trip->hotels ?? [],
            ],
            'meta' => [
                'created_at' => $trip->created_at?->toIso8601String(),
                'opens' => $link->opens,
            ],
        ]);
    }

    private function countryFromRequest(Request $request): ?string
    {
        foreach (self::COUNTRY_HEADERS as $header) {
            $value = $request->headers->get($header);
            if ($value && strlen($value) === 2) {
                return strtoupper($value);
            }
        }

        $param = (string) $request->input('country', '');
        if ($param && strlen($param) === 2) {
            return strtoupper($param);
        }

        return null;
    }
}
