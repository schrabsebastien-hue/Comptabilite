<?php

namespace App\Http\Controllers;

use App\Models\ExpenseType;
use App\Models\Operation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class OperationController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Operation::with('expenseType');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('label', 'like', "%{$search}%")
                  ->orWhere('comment', 'like', "%{$search}%");
            });
        }

        if ($request->filled('expense_type_id')) {
            if ($request->input('expense_type_id') === 'none') {
                $query->whereNull('expense_type_id');
            } else {
                $query->where('expense_type_id', $request->input('expense_type_id'));
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        $operations = $query->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $expenseTypes = ExpenseType::orderBy('position')->orderBy('name')->get();

        // Financial stats
        $totalCredits = (float) $operations->where('amount', '>', 0)->sum('amount');
        $totalDebits = (float) $operations->where('amount', '<', 0)->sum('amount');
        $netBalance = $totalCredits + $totalDebits;

        return Inertia::render('Operations/Index', [
            'operations' => $operations,
            'expenseTypes' => $expenseTypes,
            'filters' => $request->only(['search', 'expense_type_id', 'date_from', 'date_to']),
            'stats' => [
                'totalCredits' => $totalCredits,
                'totalDebits' => $totalDebits,
                'netBalance' => $netBalance,
                'totalCount' => $operations->count(),
            ],
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xls,xlsx,csv,txt,html|max:20480',
        ]);

        $file = $request->file('file');
        $filePath = $file->getRealPath();
        $extension = strtolower($file->getClientOriginalExtension());

        $rows = [];

        try {
            // Try loading with PhpSpreadsheet first
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray(null, true, true, true);
        } catch (\Throwable $e) {
            // Fallback for custom CSV or HTML-table saved as .xls
            $content = file_get_contents($filePath);
            $rows = $this->parseCsvOrHtmlFallback($content);
        }

        if (empty($rows)) {
            return redirect()->back()->with('error', 'Le fichier est vide ou n\'a pas pu être lu.');
        }

        // Find Header Row & Column Indexes
        $headers = [];
        $headerRowIndex = null;

        foreach ($rows as $rowIndex => $row) {
            $normalizedRow = array_map(function ($val) {
                return strtolower(trim((string) $val));
            }, $row);

            // Search for Date operation or similar in row
            foreach ($normalizedRow as $colKey => $cellText) {
                if (str_contains($cellText, 'date operation') || str_contains($cellText, 'date opération') || str_contains($cellText, 'date')) {
                    $headerRowIndex = $rowIndex;
                    $headers = $normalizedRow;
                    break 2;
                }
            }
        }

        if ($headerRowIndex === null) {
            // Default to first row as header if no explicit match
            $headerRowIndex = array_key_first($rows);
            $headers = array_map(fn($val) => strtolower(trim((string) $val)), $rows[$headerRowIndex]);
        }

        // Identify Target Column Letters/Keys
        $dateCol = $this->findColumnIndex($headers, ['date operation', 'date opération', 'date_operation', 'date']);
        $labelCol = $this->findColumnIndex($headers, ['sous categorie operation', 'sous categorie', 'sous-categorie', 'categorie', 'intitule', 'titre']);
        $amountCol = $this->findColumnIndex($headers, ['montant operation', 'montant_operation', 'montant']);
        $commentCol = $this->findColumnIndex($headers, ['libelle operation', 'libelle_operation', 'libelle', 'commentaire', 'description']);

        if (!$dateCol || !$amountCol) {
            return redirect()->back()->with('error', 'Impossible de détecter les colonnes obligatoires (Date operation et Montant operation) dans le fichier.');
        }

        $importedCount = 0;
        $skippedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($rows as $rowIndex => $row) {
                if ($rowIndex <= $headerRowIndex) {
                    continue; // Skip headers
                }

                $rawDate = $row[$dateCol] ?? null;
                $rawLabel = $row[$labelCol] ?? '';
                $rawAmount = $row[$amountCol] ?? null;
                $rawComment = $row[$commentCol] ?? '';

                if (empty($rawDate) && empty($rawAmount)) {
                    continue; // Empty line
                }

                $parsedDate = $this->parseDate($rawDate);
                $parsedAmount = $this->parseAmount($rawAmount);

                if (!$parsedDate || $parsedAmount === null) {
                    continue; // Invalid date or amount format
                }

                $label = trim((string) $rawLabel);
                if (empty($label)) {
                    $label = 'Opération sans intitulé';
                }

                $comment = trim((string) $rawComment);

                // Compute unique hash to prevent duplicate imports
                $hashString = $parsedDate . '|' . sprintf('%.2f', $parsedAmount) . '|' . $label . '|' . $comment;
                $importHash = md5($hashString);

                $existing = Operation::where('import_hash', $importHash)->exists();

                if ($existing) {
                    $skippedCount++;
                    continue;
                }

                Operation::create([
                    'date' => $parsedDate,
                    'label' => $label,
                    'amount' => $parsedAmount,
                    'comment' => $comment,
                    'import_hash' => $importHash,
                ]);

                $importedCount++;
            }

            DB::commit();

            $message = "Importation réussie : {$importedCount} nouvelle(s) opération(s) ajoutée(s).";
            if ($skippedCount > 0) {
                $message .= " ({$skippedCount} ligne(s) déjà existante(s) ignorée(s)).";
            }

            return redirect()->back()->with('success', $message);
        } catch (\Throwable $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Erreur lors de l\'enregistrement des données : ' . $e->getMessage());
        }
    }

    public function update(Request $request, Operation $operation)
    {
        $validated = $request->validate([
            'label' => 'sometimes|required|string|max:255',
            'comment' => 'nullable|string',
            'expense_type_id' => 'nullable|exists:expense_types,id',
        ]);

        $operation->update($validated);

        return redirect()->back()->with('success', 'Opération mise à jour.');
    }

    public function destroy(Operation $operation)
    {
        $operation->delete();

        return redirect()->back()->with('success', 'Opération supprimée.');
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:operations,id',
        ]);

        Operation::whereIn('id', $validated['ids'])->delete();

        return redirect()->back()->with('success', count($validated['ids']) . ' opération(s) supprimée(s).');
    }

    /* Helper Methods */

    private function findColumnIndex(array $headers, array $candidates): ?string
    {
        foreach ($candidates as $candidate) {
            foreach ($headers as $colKey => $headerVal) {
                if ($headerVal === $candidate || str_contains($headerVal, $candidate)) {
                    return $colKey;
                }
            }
        }
        return null;
    }

    private function parseDate($value): ?string
    {
        if (empty($value)) return null;

        // Excel numeric date timestamp
        if (is_numeric($value)) {
            try {
                return ExcelDate::excelToDateTimeObject($value)->format('Y-m-d');
            } catch (\Throwable $e) {}
        }

        $str = trim((string) $value);

        // Try formats DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
        try {
            if (preg_match('/^\d{2}[\/\.-]\d{2}[\/\.-]\d{4}$/', $str)) {
                return Carbon::createFromFormat('d/m/Y', str_replace(['-', '.'], '/', $str))->format('Y-m-d');
            }
            return Carbon::parse($str)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function parseAmount($value): ?float
    {
        if ($value === null || $value === '') return null;

        if (is_numeric($value)) {
            return (float) $value;
        }

        // Clean French currency string e.g. "1 234,56 €" -> 1234.56
        $str = (string) $value;
        $str = str_replace(["\xc2\xa0", ' ', '€', '$', 'EUR'], '', $str);
        $str = str_replace(',', '.', $str);

        if (is_numeric($str)) {
            return (float) $str;
        }

        return null;
    }

    private function parseCsvOrHtmlFallback(string $content): array
    {
        $rows = [];
        $lines = explode("\n", str_replace("\r\n", "\n", $content));

        foreach ($lines as $index => $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Try tab separator, semicolon, or comma
            if (str_contains($line, "\t")) {
                $cells = explode("\t", $line);
            } elseif (str_contains($line, ';')) {
                $cells = str_getcsv($line, ';');
            } else {
                $cells = str_getcsv($line, ',');
            }

            $colKey = 'A';
            $rowObj = [];
            foreach ($cells as $cell) {
                $rowObj[$colKey] = trim($cell, " \t\n\r\0\x0B\"'");
                $colKey++;
            }
            $rows[$index + 1] = $rowObj;
        }

        return $rows;
    }
}
