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

    public function test_can_reorder_expense_types(): void
    {
        $typeA = ExpenseType::create(['name' => 'A Type', 'color' => '#f59e0b', 'position' => 1]);
        $typeB = ExpenseType::create(['name' => 'B Type', 'color' => '#3b82f6', 'position' => 2]);
        $typeC = ExpenseType::create(['name' => 'C Type', 'color' => '#10b981', 'position' => 3]);

        // Reorder so that C is 1st, A is 2nd, B is 3rd
        $response = $this->post('/expense-types/reorder', [
            'ids' => [$typeC->id, $typeA->id, $typeB->id],
        ]);

        $response->assertRedirect();

        $this->assertEquals(1, $typeC->fresh()->position);
        $this->assertEquals(2, $typeA->fresh()->position);
        $this->assertEquals(3, $typeB->fresh()->position);

        // Verify order on operations page
        $getRes = $this->get('/');
        $getRes->assertStatus(200);
    }

    public function test_imports_multiple_identical_operations_on_same_day_when_db_is_empty(): void
    {
        $csvContent = "Date operation;Sous Categorie operation;Montant operation;Libelle operation\n" .
            "20/08/2026;Boulangerie;-2,50;Achat pain 1\n" .
            "20/08/2026;Boulangerie;-2,50;Achat pain 2\n";

        $file = UploadedFile::fake()->createWithContent('releve.csv', $csvContent);

        $response = $this->post('/operations/import', ['file' => $file]);

        $response->assertRedirect();
        $this->assertDatabaseCount('operations', 2);
    }

    public function test_imports_only_unmatched_identical_operation_when_one_exists_in_db(): void
    {
        // 1 operation already in DB
        Operation::create([
            'date' => '2026-08-20',
            'label' => 'Boulangerie',
            'amount' => -2.50,
            'comment' => 'Achat pain 1',
            'import_hash' => md5('2026-08-20|-2.50|Boulangerie|Achat pain 1'),
        ]);

        // File contains 2 operations of -2.50 on the same date
        $csvContent = "Date operation;Sous Categorie operation;Montant operation;Libelle operation\n" .
            "20/08/2026;Boulangerie;-2,50;Achat pain 1\n" .
            "20/08/2026;Boulangerie;-2,50;Achat pain 2\n";

        $file = UploadedFile::fake()->createWithContent('releve.csv', $csvContent);

        $response = $this->post('/operations/import', ['file' => $file]);

        $response->assertRedirect();
        // Should now have 2 operations in DB total (1 existing + 1 newly imported)
        $this->assertDatabaseCount('operations', 2);
    }

    public function test_recognizes_existing_operation_even_if_user_edited_label_in_db(): void
    {
        Operation::create([
            'date' => '2026-08-20',
            'label' => 'Achat boulangerie personnalisé', // User renamed label
            'amount' => -45.50,
            'comment' => 'Commentaire perso',
            'import_hash' => md5('2026-08-20|-45.50|Supermarché|Achats alimentaires de la semaine'),
        ]);

        $csvContent = "Date operation;Sous Categorie operation;Montant operation;Libelle operation\n" .
            "20/08/2026;Supermarché;-45,50;Achats alimentaires de la semaine\n";

        $file = UploadedFile::fake()->createWithContent('releve.csv', $csvContent);

        $response = $this->post('/operations/import', ['file' => $file]);

        $response->assertRedirect();
        // Should match existing operation and not create a duplicate
        $this->assertDatabaseCount('operations', 1);
    }

    public function test_recognizes_split_operation_and_prevents_duplicate_import(): void
    {
        $root = Operation::create([
            'date' => '2026-08-15',
            'label' => 'Opération principale',
            'amount' => -60.00,
            'comment' => 'Split part 1',
            'import_hash' => 'hash_root',
        ]);

        Operation::create([
            'date' => '2026-08-15',
            'label' => 'Opération scindée',
            'amount' => -40.00,
            'comment' => 'Split part 2',
            'import_hash' => 'hash_child',
            'parent_id' => $root->id,
        ]);

        // File contains the original raw operation (-100.00)
        $csvContent = "Date operation;Sous Categorie operation;Montant operation;Libelle operation\n" .
            "15/08/2026;Achats;-100,00;Paiement global\n";

        $file = UploadedFile::fake()->createWithContent('releve.csv', $csvContent);

        $response = $this->post('/operations/import', ['file' => $file]);

        $response->assertRedirect();
        // Should match split total (-100) and NOT insert new operation
        $this->assertDatabaseCount('operations', 2);
    }

    public function test_auto_categorizes_new_import_based_on_past_categorized_operations(): void
    {
        $type = ExpenseType::create(['name' => 'Restauration', 'color' => '#ef4444']);

        // Past operation categorized by user
        Operation::create([
            'date' => '2026-08-10',
            'label' => 'Sodexo Cantine',
            'amount' => -15.00,
            'comment' => null,
            'expense_type_id' => $type->id,
            'raw_bank_label' => 'PAIEMENT CB SODEXO DU 09/08/26 A MONTEVRAIN - CARTE*5621',
            'import_hash' => 'hash_sodexo_old',
            'is_validated' => true,
        ]);

        // New import containing a similar Sodexo bank label on a different date
        $csvContent = "Date operation;Sous Categorie operation;Montant operation;Libelle operation\n" .
            "25/08/2026;À catégoriser;-18,50;PAIEMENT CB SODEXO DU 24/08/26 A MONTEVRAIN - CARTE*5621\n";

        $file = UploadedFile::fake()->createWithContent('releve2.csv', $csvContent);

        $response = $this->post('/operations/import', ['file' => $file]);

        $response->assertRedirect();

        // Should have 2 operations in DB total
        $this->assertDatabaseCount('operations', 2);

        $newOp = Operation::orderBy('id', 'desc')->first();
        $this->assertEquals($type->id, $newOp->expense_type_id);
        $this->assertEquals('Sodexo Cantine', $newOp->label);
        $this->assertNull($newOp->comment); // Comment cleared automatically
        $this->assertTrue($newOp->is_auto_categorized);
        $this->assertFalse($newOp->is_validated);
    }

    public function test_can_validate_auto_categorized_suggestions(): void
    {
        $op = Operation::create([
            'date' => '2026-08-25',
            'label' => 'Sodexo Cantine',
            'amount' => -18.50,
            'import_hash' => 'hash_unvalidated',
            'is_auto_categorized' => true,
            'is_validated' => false,
        ]);

        $response = $this->patch("/operations/{$op->id}/validate");
        $response->assertRedirect();

        $this->assertTrue($op->fresh()->is_validated);
    }

    public function test_can_backdate_operation_and_preserve_original_date(): void
    {
        $op = Operation::create([
            'date' => '2026-08-27',
            'original_date' => '2026-08-27',
            'label' => 'Achat matériel',
            'amount' => -150.00,
            'import_hash' => 'hash_backdate_test',
        ]);

        // Backdate to 2026-08-01
        $response = $this->patch("/operations/{$op->id}", [
            'date' => '2026-08-01',
        ]);

        $response->assertRedirect();

        $freshOp = $op->fresh();
        // Effective date used for synthesis and filters is now 2026-08-01
        $this->assertEquals('2026-08-01', $freshOp->date->format('Y-m-d'));
        // Original bank posting date is preserved as 2026-08-27
        $this->assertEquals('2026-08-27', $freshOp->original_date->format('Y-m-d'));
    }
}



