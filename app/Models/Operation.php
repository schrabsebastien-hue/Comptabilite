<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Operation extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'original_date',
        'label',
        'amount',
        'comment',
        'expense_type_id',
        'import_hash',
        'parent_id',
        'raw_bank_label',
        'is_auto_categorized',
        'is_validated',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'original_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
        'is_auto_categorized' => 'boolean',
        'is_validated' => 'boolean',
    ];

    public function expenseType(): BelongsTo
    {
        return $this->belongsTo(ExpenseType::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Operation::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Operation::class, 'parent_id');
    }
}
