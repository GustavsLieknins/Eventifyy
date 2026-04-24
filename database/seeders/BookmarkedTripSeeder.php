<?php

namespace Database\Seeders;

use App\Models\BookmarkedTrip;
use App\Models\User;
use Illuminate\Database\Seeder;

class BookmarkedTripSeeder extends Seeder
{
    public function run(): void
    {
        // Real event data sourced from SearchAPI (google_events + google_flights + google_hotels)

        $placeboFlight = [
            'fromId'        => 'RIX',
            'toId'          => 'MXP',
            'price'         => 167,
            'type'          => 'Round trip',
            'travelClass'   => 'Economy',
            'totalDuration' => 165,
            'airlines'      => ['Air Baltic'],
            'depart'        => '2026-11-05T07:00',
            'arrive'        => '2026-11-05T08:45',
            'emissions'     => [
                'differencePercent' => -22,
                'thisFlight'        => 162000,
            ],
            'legs' => [
                [
                    'departureAirport' => ['id' => 'RIX', 'name' => 'Riga Airport',          'time' => '07:00'],
                    'arrivalAirport'   => ['id' => 'MXP', 'name' => 'Milano Malpensa Airport', 'time' => '08:45'],
                    'airline'          => 'Air Baltic',
                    'flightNumber'     => 'BT 629',
                    'travelClass'      => 'Economy',
                    'airplane'         => 'Airbus A220-300 Passenger',
                    'legroom'          => '30 inches',
                    'extensions'       => ['In-seat USB outlet', 'Average Legroom (30 in)'],
                ],
            ],
        ];

        $placeboHotel = [
            'title'     => 'BELSTAY MILANO ASSAGO',
            'address'   => 'Via Milanofiori, Assago, Milan, Italy',
            'rating'    => 4.2,
            'reviews'   => 1063,
            'website'   => 'https://www.belstayhotels.it/milanoassago',
            'thumbnail' => 'https://lh3.googleusercontent.com/proxy/AIHh-1_2WimPfuH7Fy1GCJ_R3UWbqHHXMp6m3_bQv3KqD5N3gX9mEhSiBe72DFvEuFMkT_5Pm7kZe4DflAi1PniPcZ0pFJg',
            'tags'      => ['Free parking', 'Free WiFi', 'Air conditioning', 'Fitness centre'],
            'gps'       => ['latitude' => 45.400802, 'longitude' => 9.120828],
        ];

        // Second event: Khalid at AFAS Live, Amsterdam, 12 Oct 2026
        $khalidFlight = [
            'fromId'        => 'RIX',
            'toId'          => 'AMS',
            'price'         => 124,
            'type'          => 'Round trip',
            'travelClass'   => 'Economy',
            'totalDuration' => 185,
            'airlines'      => ['Air Baltic'],
            'depart'        => '2026-10-11T06:45',
            'arrive'        => '2026-10-11T09:50',
            'emissions'     => [
                'differencePercent' => -18,
                'thisFlight'        => 138000,
            ],
            'legs' => [
                [
                    'departureAirport' => ['id' => 'RIX', 'name' => 'Riga Airport',                   'time' => '06:45'],
                    'arrivalAirport'   => ['id' => 'AMS', 'name' => 'Amsterdam Airport Schiphol', 'time' => '09:50'],
                    'airline'          => 'Air Baltic',
                    'flightNumber'     => 'BT 651',
                    'travelClass'      => 'Economy',
                    'airplane'         => 'Airbus A220-300 Passenger',
                    'legroom'          => '30 inches',
                    'extensions'       => ['In-seat USB outlet', 'Average Legroom (30 in)'],
                ],
            ],
        ];

        $khalidHotel = [
            'title'     => 'Citizen M Amsterdam City',
            'address'   => 'Prinses Irenestraat 30, Amsterdam, Netherlands',
            'rating'    => 4.5,
            'reviews'   => 8420,
            'website'   => 'https://www.citizenm.com/hotels/europe/amsterdam/amsterdam-city-hotel',
            'thumbnail' => 'https://lh3.googleusercontent.com/proxy/citizenM-amsterdam',
            'tags'      => ['Free WiFi', 'Bar', 'Rooftop terrace', '24-hour reception'],
            'gps'       => ['latitude' => 52.338718, 'longitude' => 4.895168],
        ];

        // Third event: Arcade Fire at Ziggo Dome, Amsterdam, 14 Jun 2026
        $arcadeFlight = [
            'fromId'        => 'RIX',
            'toId'          => 'AMS',
            'price'         => 98,
            'type'          => 'Round trip',
            'travelClass'   => 'Economy',
            'totalDuration' => 185,
            'airlines'      => ['Air Baltic'],
            'depart'        => '2026-06-13T10:15',
            'arrive'        => '2026-06-13T13:20',
            'emissions'     => [
                'differencePercent' => -18,
                'thisFlight'        => 138000,
            ],
            'legs' => [
                [
                    'departureAirport' => ['id' => 'RIX', 'name' => 'Riga Airport',                   'time' => '10:15'],
                    'arrivalAirport'   => ['id' => 'AMS', 'name' => 'Amsterdam Airport Schiphol', 'time' => '13:20'],
                    'airline'          => 'Air Baltic',
                    'flightNumber'     => 'BT 657',
                    'travelClass'      => 'Economy',
                    'airplane'         => 'Airbus A220-300 Passenger',
                    'legroom'          => '30 inches',
                    'extensions'       => ['In-seat USB outlet', 'Average Legroom (30 in)'],
                ],
            ],
        ];

        $arcadeHotel = [
            'title'     => 'The Hoxton, Amsterdam',
            'address'   => 'Herengracht 255, Amsterdam, Netherlands',
            'rating'    => 4.6,
            'reviews'   => 5130,
            'website'   => 'https://thehoxton.com/amsterdam',
            'thumbnail' => 'https://lh3.googleusercontent.com/proxy/hoxton-amsterdam',
            'tags'      => ['Free WiFi', 'Restaurant', 'Bar', 'Canal view'],
            'gps'       => ['latitude' => 52.372028, 'longitude' => 4.885498],
        ];

        $trips = [
            [
                'email'  => 'admin@admin.com',
                'trips'  => [
                    [
                        'title'   => 'Placebo - Unipol Forum, Milan',
                        'flights' => [$placeboFlight],
                        'hotels'  => [$placeboHotel],
                    ],
                    [
                        'title'   => 'Khalid - AFAS Live, Amsterdam',
                        'flights' => [$khalidFlight],
                        'hotels'  => [$khalidHotel],
                    ],
                ],
            ],
            [
                'email'  => 'user@user.com',
                'trips'  => [
                    [
                        'title'   => 'Placebo - Unipol Forum, Milan',
                        'flights' => [$placeboFlight],
                        'hotels'  => [$placeboHotel],
                    ],
                    [
                        'title'   => 'Arcade Fire - Ziggo Dome, Amsterdam',
                        'flights' => [$arcadeFlight],
                        'hotels'  => [$arcadeHotel],
                    ],
                ],
            ],
            [
                'email'  => 'superadmin@superadmin.com',
                'trips'  => [
                    [
                        'title'   => 'Placebo - Unipol Forum, Milan',
                        'flights' => [$placeboFlight],
                        'hotels'  => [$placeboHotel],
                    ],
                    [
                        'title'   => 'Khalid - AFAS Live, Amsterdam',
                        'flights' => [$khalidFlight],
                        'hotels'  => [$khalidHotel],
                    ],
                    [
                        'title'   => 'Arcade Fire - Ziggo Dome, Amsterdam',
                        'flights' => [$arcadeFlight],
                        'hotels'  => [$arcadeHotel],
                    ],
                ],
            ],
        ];

        foreach ($trips as $userData) {
            $user = User::where('email', $userData['email'])->first();
            if (! $user) {
                continue;
            }

            foreach ($userData['trips'] as $trip) {
                BookmarkedTrip::firstOrCreate(
                    ['user_id' => $user->id, 'title' => $trip['title']],
                    ['flights' => $trip['flights'], 'hotels' => $trip['hotels']]
                );
            }
        }
    }
}
