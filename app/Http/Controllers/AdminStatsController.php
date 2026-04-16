<?php

namespace App\Http\Controllers;

use App\Services\AdminStatsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminStatsController extends Controller
{
    public function dashboard(Request $request, AdminStatsService $stats)
    {
        return Inertia::render('Admin/Dashboard', [
            'totals'         => $stats->totals(),
            'visitsByDay'    => $stats->visitsByDay(),
            'searchesByDay'  => $stats->searchesByDay(),
            'topCountries'   => $stats->topCountries(),
            'topPaths'       => $stats->topPaths(),
            'topQueries'     => $stats->topQueries(),
            'topSavedTitles' => $stats->topSavedTitles(),
            'topShared'      => $stats->topShared(),
        ]);
    }
}
