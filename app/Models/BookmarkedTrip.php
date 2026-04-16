<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookmarkedTrip extends Model
{
    protected $fillable = ['user_id', 'title', 'flights', 'hotels'];

    protected $casts = ['flights' => 'array', 'hotels' => 'array'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shareLinks(): HasMany
    {
        return $this->hasMany(ShareLink::class, 'trip_id');
    }
}
