<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SynthesisManualValue extends Model
{
    protected $fillable = [
        'year',
        'row_id',
        'month',
        'value',
    ];
}
