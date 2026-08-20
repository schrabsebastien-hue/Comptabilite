<?php

namespace Database\Seeders;

use App\Models\ExpenseType;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $defaultTypes = [
            ['name' => 'Alimentation & Courses', 'color' => '#f59e0b'],
            ['name' => 'Transport & Carburant', 'color' => '#3b82f6'],
            ['name' => 'Loyer & Logement', 'color' => '#8b5cf6'],
            ['name' => 'Abonnements & Logiciels', 'color' => '#ec4899'],
            ['name' => 'Matériel & Équipement', 'color' => '#10b981'],
            ['name' => 'Santé & Assurances', 'color' => '#06b6d4'],
            ['name' => 'Loisirs & Restauration', 'color' => '#f97316'],
            ['name' => 'Divers & Imprévus', 'color' => '#64748b'],
        ];

        foreach ($defaultTypes as $type) {
            ExpenseType::firstOrCreate(['name' => $type['name']], $type);
        }
    }
}
