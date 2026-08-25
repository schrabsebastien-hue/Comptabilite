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
        Schema::table('expense_types', function (Blueprint $table) {
            $table->integer('position')->default(0)->after('color');
        });

        // Initialize positions based on current alphabetical order
        $types = \Illuminate\Support\Facades\DB::table('expense_types')->orderBy('name')->get();
        foreach ($types as $index => $type) {
            \Illuminate\Support\Facades\DB::table('expense_types')
                ->where('id', $type->id)
                ->update(['position' => $index + 1]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expense_types', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }
};
