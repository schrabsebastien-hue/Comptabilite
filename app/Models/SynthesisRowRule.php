<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SynthesisRowRule extends Model
{
    protected $fillable = [
        'row_id',
        'label',
        'section',
        'calculation_type',
        'expense_type_ids',
        'provision_row_id',
        'deducted_row_ids',
        'calculation_config',
        'is_provision',
        'is_italic',
        'position',
    ];

    protected $casts = [
        'expense_type_ids' => 'array',
        'deducted_row_ids' => 'array',
        'calculation_config' => 'array',
        'is_provision' => 'boolean',
        'is_italic' => 'boolean',
        'position' => 'integer',
    ];
}
