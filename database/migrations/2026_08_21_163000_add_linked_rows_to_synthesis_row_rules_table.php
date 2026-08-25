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
        Schema::table('synthesis_row_rules', function (Blueprint $table) {
            $table->json('deducted_row_ids')->nullable()->after('provision_row_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('synthesis_row_rules', function (Blueprint $table) {
            $table->dropColumn('deducted_row_ids');
        });
    }
};
