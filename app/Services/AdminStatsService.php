<?php

namespace App\Services;

use App\Models\BookmarkedTrip;
use App\Models\SearchLog;
use App\Models\ShareLink;
use App\Models\ShareLinkVisit;
use App\Models\VisitLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminStatsService
{
    public function totals(): array
    {
        return [
            'visits'      => VisitLog::query()->count(),
            'searches'    => SearchLog::query()->count(),
            'share_links' => ShareLink::query()->count(),
            'share_opens' => $this->sumOpens(),
            'trips'       => BookmarkedTrip::query()->count(),
        ];
    }

    public function visitsByDay(int $days = 14)
    {
        return VisitLog::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'count' => (int) $row->count]);
    }

    public function searchesByDay(int $days = 14)
    {
        return SearchLog::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'count' => (int) $row->count]);
    }

    public function topCountries(int $limit = 10)
    {
        return VisitLog::query()
            ->select('country', DB::raw('COUNT(*) as count'))
            ->whereNotNull('country')
            ->groupBy('country')
            ->orderByDesc('count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => ['country' => $row->country, 'count' => (int) $row->count]);
    }

    public function topPaths(int $limit = 10)
    {
        return VisitLog::query()
            ->select('path', DB::raw('COUNT(*) as count'))
            ->groupBy('path')
            ->orderByDesc('count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => ['path' => $row->path, 'count' => (int) $row->count]);
    }

    public function topQueries(int $limit = 10)
    {
        return SearchLog::query()
            ->select('query', DB::raw('COUNT(*) as count'))
            ->groupBy('query')
            ->orderByDesc('count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => ['query' => $row->query, 'count' => (int) $row->count]);
    }

    public function topSavedTitles(int $limit = 10)
    {
        return BookmarkedTrip::query()
            ->select('title', DB::raw('COUNT(*) as count'))
            ->whereNotNull('title')
            ->where('title', '<>', '')
            ->groupBy('title')
            ->orderByDesc('count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => ['title' => $row->title, 'count' => (int) $row->count]);
    }

    public function topShared(int $limit = 10)
    {
        return ShareLink::query()
            ->with('trip:id,title')
            ->orderByDesc('opens')
            ->limit($limit)
            ->get()
            ->map(fn ($link) => [
                'id'    => $link->id,
                'slug'  => $link->slug,
                'opens' => (int) $link->opens,
                'title' => optional($link->trip)->title,
            ]);
    }

    private function sumOpens(): int
    {
        if (Schema::hasColumn('share_links', 'opens')) {
            return (int) ShareLink::query()->sum('opens');
        }

        return (int) ShareLinkVisit::query()->count();
    }
}
