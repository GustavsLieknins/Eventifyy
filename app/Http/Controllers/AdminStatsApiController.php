<?php

namespace App\Http\Controllers;

use App\Services\AdminStatsService;

class AdminStatsApiController extends Controller
{
    public function index(AdminStatsService $stats)
    {
        return response()->json($stats->totals());
    }
}
