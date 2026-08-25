<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('synthesis_row_rules', function (Blueprint $table) {
            $table->id();
            $table->string('row_id')->unique();
            $table->string('label');
            $table->string('section'); // encours_provisions, charges_fixes, charges_variables, revenus
            $table->string('calculation_type')->default('manual'); // cumulative_encours, monthly_operations_sum, manual
            $table->json('expense_type_ids')->nullable(); // array of integer expense_type IDs
            $table->string('provision_row_id')->nullable(); // linked row_id in charges fixes
            $table->boolean('is_provision')->default(false);
            $table->boolean('is_italic')->default(false);
            $table->integer('position')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('synthesis_row_rules');
    }
};
