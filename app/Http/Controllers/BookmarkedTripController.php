<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class BookmarkedTripController extends Controller
{
    public function index(Request $request)
    {
        $trips = $request->user()->bookmarkedTrips()->latest()->get();

        return Inertia::render('Bookmarks/Bookmarks', [
            'trips' => $trips->map(fn ($trip) => [
                'id'      => $trip->id,
                'title'   => $trip->title,
                'flights' => $trip->flights ?? [],
                'hotels'  => $trip->hotels ?? [],
            ]),
            'user' => $request->user(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'   => 'nullable|string|max:255',
            'flights' => 'nullable|array',
            'hotels'  => 'nullable|array',
        ]);

        $request->user()->bookmarkedTrips()->create([
            'title'   => $data['title'] ?? 'My Trip',
            'flights' => $data['flights'] ?? [],
            'hotels'  => $data['hotels'] ?? [],
        ]);

        return redirect()->route('bookmarks')
            ->with('success', 'Trip saved successfully!');
    }

    public function destroy(Request $request, $id)
    {
        $request->user()->bookmarkedTrips()->findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }
}
