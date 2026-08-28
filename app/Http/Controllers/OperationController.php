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

        // Compute split groups info efficiently
        $splitTotalsMap = [];
        $parentIds = Operation::whereNotNull('parent_id')->pluck('parent_id')->unique()->filter()->values()->all();
        if (!empty($parentIds)) {
            $splitGroups = Operation::whereIn('id', $parentIds)
                ->orWhereIn('parent_id', $parentIds)
                ->get(['id', 'parent_id', 'amount'])
                ->groupBy(function ($op) {
                    return $op->parent_id ?: $op->id;
                });

            foreach ($splitGroups as $rootId => $groupOps) {
                if ($groupOps->count() > 1) {
                    $splitTotalsMap[$rootId] = [
                        'count' => $groupOps->count(),
                        'total' => (float) $groupOps->sum('amount'),
                    ];
                }
            }
        }

        $operations->transform(function ($op) use ($splitTotalsMap) {
            $rootId = $op->parent_id ?: $op->id;
            if (isset($splitTotalsMap[$rootId])) {
                $op->is_split = true;
                $op->split_group_id = $rootId;
                $op->split_total_amount = $splitTotalsMap[$rootId]['total'];
            } else {
                $op->is_split = false;
                $op->split_group_id = null;
                $op->split_total_amount = null;
            }
            return $op;
        });

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

    public function split(Request $request, Operation $operation)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|gt:0',
            'date' => 'required|date',
            'label' => 'required|string|max:255',
            'expense_type_id' => 'nullable|exists:expense_types,id',
            'comment' => 'nullable|string',
        ]);

        $originalAmount = (float) $operation->amount;
        $absOriginal = abs($originalAmount);
        $splitAmountInput = (float) $validated['amount'];

        if ($splitAmountInput >= $absOriginal) {
            return redirect()->back()->withErrors([
                'amount' => 'Le montant de la seconde ligne doit être strictement inférieur au montant d\'origine (' . number_format($absOriginal, 2, ',', ' ') . ' €).'
            ]);
        }

        DB::transaction(function () use ($operation, $validated, $originalAmount, $splitAmountInput) {
            $isDebit = $originalAmount < 0;

            // Split portion amount (same sign as original)
            $newSplitAmount = $isDebit ? -$splitAmountInput : $splitAmountInput;

            // Remaining amount on target line
            $updatedOriginalAmount = $originalAmount - $newSplitAmount;

            // Root ID for split grouping
            $rootId = $operation->parent_id ?: $operation->id;

            $operation->update([
                'amount' => $updatedOriginalAmount,
            ]);

            Operation::create([
                'date' => $validated['date'],
                'label' => $validated['label'],
                'amount' => $newSplitAmount,
                'comment' => $validated['comment'] ?? null,
                'expense_type_id' => $validated['expense_type_id'] ?? null,
                'import_hash' => 'split_' . uniqid() . '_' . md5(microtime() . $validated['label']),
                'parent_id' => $rootId,
            ]);
        });

        return redirect()->back()->with('success', 'Opération scindée avec succès.');
    }

    public function import(Request $request, \App\Services\OperationImportService $importService)
    {
        $request->validate([
            'file' => 'required|file|mimes:xls,xlsx,csv,txt,html|max:20480',
        ]);

        try {
            $result = $importService->importFile($request->file('file'));

            $message = "Importation réussie : {$result['imported']} nouvelle(s) opération(s) ajoutée(s).";
            if ($result['skipped'] > 0) {
                $message .= " ({$result['skipped']} ligne(s) déjà existante(s) ignorée(s)).";
            }

            return redirect()->back()->with('success', $message);
        } catch (\InvalidArgumentException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Erreur lors de l\'enregistrement des données : ' . $e->getMessage());
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'label' => 'required|string|max:255',
            'amount' => 'required|numeric',
            'comment' => 'nullable|string',
            'expense_type_id' => 'nullable|exists:expense_types,id',
        ]);

        $importHash = 'manual_' . uniqid() . '_' . md5(microtime() . $validated['label'] . $validated['amount']);

        Operation::create([
            'date' => $validated['date'],
            'original_date' => $validated['date'],
            'label' => $validated['label'],
            'amount' => $validated['amount'],
            'comment' => $validated['comment'] ?? null,
            'expense_type_id' => $validated['expense_type_id'] ?? null,
            'import_hash' => $importHash,
        ]);

        return redirect()->back()->with('success', 'Opération ajoutée avec succès.');
    }

    public function update(Request $request, Operation $operation)
    {
        $validated = $request->validate([
            'date' => 'sometimes|required|date',
            'label' => 'sometimes|required|string|max:255',
            'comment' => 'nullable|string',
            'expense_type_id' => 'nullable|exists:expense_types,id',
        ]);

        if (isset($validated['date']) && $validated['date'] !== $operation->date) {
            if (empty($operation->original_date)) {
                $operation->original_date = $operation->date;
            }
        }

        $validated['is_validated'] = true;

        $operation->update($validated);

        return redirect()->back()->with('success', 'Opération mise à jour.');
    }

    public function validateSuggestion(Operation $operation)
    {
        $operation->update(['is_validated' => true]);

        return redirect()->back()->with('success', 'Suggestion d\'opération validée.');
    }

    public function bulkValidateSuggestions(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:operations,id',
        ]);

        Operation::whereIn('id', $validated['ids'])->update(['is_validated' => true]);

        return redirect()->back()->with('success', count($validated['ids']) . ' suggestion(s) validée(s).');
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

    public function bulkClearComments(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:operations,id',
        ]);

        Operation::whereIn('id', $validated['ids'])->update(['comment' => null]);

        return redirect()->back()->with('success', count($validated['ids']) . ' commentaire(s) effacé(s).');
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
