<?php

namespace Database\Seeders;

use App\Models\ExpenseType;
use App\Models\Operation;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class Annee2026Seeder extends Seeder
{
    private array $typeMapping = [
        'Transports'             => 'Transport & Carburant',
        'Dépense exceptionnelle' => 'Dépenses exceptionnelles',
        'Assurances prêt'        => 'Assurance prêt',
        'Téléphonie'             => 'Téléphonie & internet',
    ];

    public function run(): void
    {
        $filePath = base_path('Année_2026.xlsx');
        if (!file_exists($filePath)) {
            $this->command->error("Fichier introuvable : $filePath");
            return;
        }

        $this->command->info('Chargement du fichier Excel...');
        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getSheetByName('Feuil1');
        $highestRow = $sheet->getHighestRow();

        $this->command->info('Vidage de la table operations...');
        DB::statement('DELETE FROM operations');
        DB::statement("DELETE FROM sqlite_sequence WHERE name='operations'");

        $expenseTypes = ExpenseType::all()->keyBy('name');
        $typeCache = [];
        $imported = 0;
        $skipped = 0;
        $unknownTypes = [];

        $this->command->info("Import des lignes 2 à $highestRow...");
        $usedHashes = [];
        $duplicateCount = 0;
        DB::beginTransaction();
        try {
            for ($row = 2; $row <= $highestRow; $row++) {
                $rawDate    = $sheet->getCell('A' . $row)->getValue();
                $rawType    = trim((string) $sheet->getCell('C' . $row)->getValue());
                $rawLabel   = trim((string) $sheet->getCell('D' . $row)->getValue());
                $rawAmount  = $sheet->getCell('E' . $row)->getValue();
                $rawComment = trim((string) $sheet->getCell('F' . $row)->getValue());

                if (empty($rawDate) && empty($rawAmount)) { $skipped++; continue; }
                $parsedDate = $this->parseDate($rawDate);
                if (!$parsedDate) { $skipped++; continue; }
                if (!is_numeric($rawAmount)) { $skipped++; continue; }
                $parsedAmount = (float) $rawAmount;
                $label = !empty($rawLabel) ? $rawLabel : 'Opération sans intitulé';

                $expenseTypeId = null;
                if (!empty($rawType)) {
                    if (!isset($typeCache[$rawType])) {
                        $dbName = $this->typeMapping[$rawType] ?? $rawType;
                        $expenseType = $expenseTypes->get($dbName);
                        if ($expenseType) {
                            $typeCache[$rawType] = $expenseType->id;
                        } else {
                            $typeCache[$rawType] = null;
                            $unknownTypes[] = $rawType;
                        }
                    }
                    $expenseTypeId = $typeCache[$rawType];
                }

                $baseHash = $parsedDate . '|' . sprintf('%.2f', $parsedAmount) . '|' . $label . '|' . $rawComment;
                // Si le hash est déjà utilisé (doublon exact dans le fichier), on l'indexe avec le numéro de ligne
                $importHash = md5($baseHash);
                if (isset($usedHashes[$importHash])) {
                    $importHash = md5($baseHash . '|row=' . $row);
                    $duplicateCount++;
                }
                $usedHashes[$importHash] = true;

                Operation::create([
                    'date'            => $parsedDate,
                    'label'           => $label,
                    'amount'          => $parsedAmount,
                    'comment'         => $rawComment ?: null,
                    'expense_type_id' => $expenseTypeId,
                    'import_hash'     => $importHash,
                ]);
                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command->error('Erreur : ' . $e->getMessage());
            return;
        }

        $this->command->info("Import terminé : $imported opération(s) importée(s), $skipped ignorée(s).");
        if ($duplicateCount > 0) {
            $this->command->warn("$duplicateCount ligne(s) dupliques dans le fichier Excel (hash dédisambigué par numéro de ligne).");
        }
        if (!empty($unknownTypes)) {
            $unique = array_unique($unknownTypes);
            $this->command->warn('Types non trouvés en base (sans catégorie) :');
            foreach ($unique as $t) { $this->command->warn("   - $t"); }
        }
    }

    private function parseDate($value): ?string
    {
        if (empty($value)) return null;
        if (is_numeric($value)) {
            try { return ExcelDate::excelToDateTimeObject((float) $value)->format('Y-m-d'); } catch (\Throwable $e) {}
        }
        $str = trim((string) $value);
        try {
            if (preg_match('/^\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4}$/', $str)) {
                return Carbon::createFromFormat('d/m/Y', str_replace(['-', '.'], '/', $str))->format('Y-m-d');
            }
            return Carbon::parse($str)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
