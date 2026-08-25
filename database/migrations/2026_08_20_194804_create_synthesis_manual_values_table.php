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
        Schema::create('synthesis_manual_values', function (Blueprint $table) {
            $table->id();
            $table->integer('year')->index();
            $table->string('row_id')->index();
            $table->unsignedTinyInteger('month')->default(0); // 0 = initial balance (report N-1), 1..12 = Jan..Dec
            $table->decimal('value', 12, 2)->nullable();
            $table->timestamps();

            $table->unique(['year', 'row_id', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('synthesis_manual_values');
    }
};
