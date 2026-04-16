<?php

namespace App\Http\Controllers;

use App\Services\AdminStatsService;
use Illuminate\Support\Facades\DB;

class AdminStatsApiController extends Controller
{
    public function index(AdminStatsService $stats)
    {
        return response()->json([
            ...$stats->totals(),
            'db'     => config('database.default'),
            'dbname' => DB::connection()->getDatabaseName(),
        ]);
    }
}
