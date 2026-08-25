<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    public function operations(): HasMany
    {
        return $this->hasMany(Operation::class);
    }
}
