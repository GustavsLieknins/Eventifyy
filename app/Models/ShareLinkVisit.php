<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShareLinkVisit extends Model
{
    protected $table = 'share_link_visits';

    protected $fillable = ['share_link_id', 'user_id', 'country', 'ip', 'user_agent'];

    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ShareLink::class);
    }
}
