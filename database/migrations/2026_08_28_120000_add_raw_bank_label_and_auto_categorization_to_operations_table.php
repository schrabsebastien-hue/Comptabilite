<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('operations', function (Blueprint $table) {
            $table->string('raw_bank_label')->nullable()->index();
            $table->boolean('is_auto_categorized')->default(false);
            $table->boolean('is_validated')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('operations', function (Blueprint $table) {
            $table->dropColumn(['raw_bank_label', 'is_auto_categorized', 'is_validated']);
        });
    }
};
