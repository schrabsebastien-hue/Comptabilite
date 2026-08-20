<?php

namespace Tests\Feature;

use App\Models\ExpenseType;
use App\Models\Operation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class OperationTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_display_operations_page(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_can_display_expense_types_page(): void
    {
        $response = $this->get('/expense-types');

        $response->assertStatus(200);
    }

    public function test_can_create_expense_type(): void
    {
        $response = $this->post('/expense-types', [
            'name' => 'Transport Supérieur',
            'color' => '#3b82f6',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('expense_types', [
            'name' => 'Transport Supérieur',
            'color' => '#3b82f6',
        ]);
    }

    public function test_can_import_csv_bank_statement_and_deduplicate(): void
    {
        $csvContent = "Date operation;Sous Categorie operation;Montant operation;Libelle operation\n" .
            "20/08/2026;Supermarché;-45,50;Achats alimentaires de la semaine\n" .
            "19/08/2026;Virement reçu;1200,00;Salaire mensuel\n" .
            "20/08/2026;Supermarché;-45,50;Achats alimentaires de la semaine\n"; // Duplicate row

        $file = UploadedFile::fake()->createWithContent('releve.csv', $csvContent);

        $response = $this->post('/operations/import', [
            'file' => $file,
        ]);

        $response->assertRedirect();

        // Should only import 2 distinct operations, 1 duplicate ignored
        $this->assertDatabaseCount('operations', 2);
        $this->assertDatabaseHas('operations', [
            'label' => 'Supermarché',
            'amount' => -45.50,
            'comment' => 'Achats alimentaires de la semaine',
        ]);
        $this->assertDatabaseHas('operations', [
            'label' => 'Virement reçu',
            'amount' => 1200.00,
            'comment' => 'Salaire mensuel',
        ]);
    }

    public function test_can_update_operation_expense_type(): void
    {
        $type = ExpenseType::create(['name' => 'Alimentation', 'color' => '#f59e0b']);
        $operation = Operation::create([
            'date' => '2026-08-20',
            'label' => 'Supermarché',
            'amount' => -45.50,
            'comment' => 'Courses',
            'import_hash' => 'dummyhash123',
        ]);

        $response = $this->patch("/operations/{$operation->id}", [
            'expense_type_id' => $type->id,
            'label' => 'Supermarché Carrefour',
            'comment' => 'Courses hebdomadaires',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('operations', [
            'id' => $operation->id,
            'expense_type_id' => $type->id,
            'label' => 'Supermarché Carrefour',
            'comment' => 'Courses hebdomadaires',
        ]);
    }
}
