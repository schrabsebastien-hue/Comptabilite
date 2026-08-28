<?php

namespace App\Services;

use App\Models\Operation;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class OperationImportService
{
    /**
     * Import operations from an Excel or CSV file with contextual deduplication.
     *
     * @param UploadedFile $file
     * @return array{imported: int, skipped: int}
     */
    public function importFile(UploadedFile $file): array
    {
        $filePath = $file->getRealPath();
        $rows = [];

        try {
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray(null, true, true, true);
        } catch (\Throwable $e) {
            $content = file_get_contents($filePath);
            $rows = $this->parseCsvOrHtmlFallback($content);
        }

        if (empty($rows)) {
            throw new \InvalidArgumentException('Le fichier est vide ou n\'a pas pu être lu.');
        }

        // Find Header Row & Column Indexes
        $headers = [];
        $headerRowIndex = null;

        foreach ($rows as $rowIndex => $row) {
            $normalizedRow = array_map(function ($val) {
                return strtolower(trim((string) $val));
            }, $row);

            foreach ($normalizedRow as $colKey => $cellText) {
                if (str_contains($cellText, 'date operation') || str_contains($cellText, 'date opération') || str_contains($cellText, 'date')) {
                    $headerRowIndex = $rowIndex;
                    $headers = $normalizedRow;
                    break 2;
                }
            }
        }

        if ($headerRowIndex === null) {
            $headerRowIndex = array_key_first($rows);
            $headers = array_map(fn($val) => strtolower(trim((string) $val)), $rows[$headerRowIndex]);
        }

        $dateCol = $this->findColumnIndex($headers, ['date operation', 'date opération', 'date_operation', 'date']);
        $labelCol = $this->findColumnIndex($headers, ['sous categorie operation', 'sous categorie', 'sous-categorie', 'categorie', 'intitule', 'titre']);
        $amountCol = $this->findColumnIndex($headers, ['montant operation', 'montant_operation', 'montant']);
        $commentCol = $this->findColumnIndex($headers, ['libelle operation', 'libelle_operation', 'libelle', 'commentaire', 'description']);

        if (!$dateCol || !$amountCol) {
            throw new \InvalidArgumentException('Impossible de détecter les colonnes obligatoires (Date operation et Montant operation) dans le fichier.');
        }

        // 1. Extract and Parse File Operations
        $parsedFileOps = [];

        foreach ($rows as $rowIndex => $row) {
            if ($rowIndex <= $headerRowIndex) {
                continue;
            }

            $rawDate = $row[$dateCol] ?? null;
            $rawLabel = $row[$labelCol] ?? '';
            $rawAmount = $row[$amountCol] ?? null;
            $rawComment = $row[$commentCol] ?? '';

            if (empty($rawDate) && empty($rawAmount)) {
                continue;
            }

            $parsedDate = $this->parseDate($rawDate);
            $parsedAmount = $this->parseAmount($rawAmount);

            if (!$parsedDate || $parsedAmount === null) {
                continue;
            }

            $label = trim((string) $rawLabel);
            if (empty($label)) {
                $label = 'Opération sans intitulé';
            }

            $comment = trim((string) $rawComment);
            $rawBankLabel = !empty($comment) ? $comment : $label;

            $hashString = $parsedDate . '|' . sprintf('%.2f', $parsedAmount) . '|' . $label . '|' . $comment;
            $importHash = md5($hashString);

            $parsedFileOps[] = [
                'row_index' => $rowIndex,
                'date' => $parsedDate,
                'label' => $label,
                'amount' => (float) sprintf('%.2f', $parsedAmount),
                'comment' => $comment,
                'raw_bank_label' => $rawBankLabel,
                'import_hash' => $importHash,
                'matched' => false,
            ];
        }

        if (empty($parsedFileOps)) {
            return ['imported' => 0, 'skipped' => 0];
        }

        // Sort parsed file operations chronologically (date asc, row_index asc)
        usort($parsedFileOps, function ($a, $b) {
            if ($a['date'] === $b['date']) {
                return $a['row_index'] <=> $b['row_index'];
            }
            return strcmp($a['date'], $b['date']);
        });

        // Load Past Categorized Operations Knowledge Base for Auto-Categorization
        $categorizedDbOps = Operation::whereNotNull('expense_type_id')
            ->where(function ($q) {
                $q->whereNotNull('raw_bank_label')
                  ->orWhereNotNull('comment')
                  ->orWhereNotNull('label');
            })
            ->orderBy('id', 'desc')
            ->get();

        // 2. Fetch Relevant DB Operations and Group Split Operations
        $dates = array_column($parsedFileOps, 'date');
        $minDate = min($dates);
        $maxDate = max($dates);

        // Include margin around date range
        $dbMinDate = Carbon::parse($minDate)->subDays(7)->format('Y-m-d');
        $dbMaxDate = Carbon::parse($maxDate)->addDays(7)->format('Y-m-d');

        $dbRawOps = Operation::whereBetween('date', [$dbMinDate, $dbMaxDate])->get();

        // Group DB ops by split root ID
        $splitGroups = $dbRawOps->groupBy(function ($op) {
            return $op->parent_id ?: $op->id;
        });

        $dbOps = [];
        foreach ($splitGroups as $rootId => $groupOps) {
            $rootOp = $groupOps->firstWhere('id', $rootId) ?: $groupOps->first();
            $totalAmount = (float) $groupOps->sum('amount');

            $dbOps[] = [
                'id' => $rootId,
                'date' => Carbon::parse($rootOp->date)->format('Y-m-d'),
                'amount' => (float) sprintf('%.2f', $totalAmount),
                'label' => $rootOp->label,
                'comment' => $rootOp->comment,
                'import_hash' => $rootOp->import_hash,
                'matched' => false,
                'is_split' => $groupOps->count() > 1,
            ];
        }

        // Sort DB ops chronologically (date asc, id asc)
        usort($dbOps, function ($a, $b) {
            if ($a['date'] === $b['date']) {
                return $a['id'] <=> $b['id'];
            }
            return strcmp($a['date'], $b['date']);
        });

        // 3. Match File Operations against DB Operations
        $importedCount = 0;
        $skippedCount = 0;
        $createdHashesInBatch = [];

        DB::beginTransaction();
        try {
            foreach ($parsedFileOps as $fIdx => &$fOp) {
                $filePrev = $fIdx > 0 ? $parsedFileOps[$fIdx - 1] : null;
                $fileNext = $fIdx < (count($parsedFileOps) - 1) ? $parsedFileOps[$fIdx + 1] : null;

                // Occurrence index among identical file operations
                $fOccurrence = 0;
                for ($k = 0; $k <= $fIdx; $k++) {
                    if ($parsedFileOps[$k]['date'] === $fOp['date'] && abs($parsedFileOps[$k]['amount'] - $fOp['amount']) < 0.001) {
                        $fOccurrence++;
                    }
                }

                $bestCandidateIdx = null;
                $bestScore = -1;

                foreach ($dbOps as $dIdx => $dOp) {
                    if ($dOp['matched']) {
                        continue;
                    }

                    // Must match date and amount exactly
                    if ($dOp['date'] !== $fOp['date'] || abs($dOp['amount'] - $fOp['amount']) >= 0.001) {
                        continue;
                    }

                    $score = 60; // Base score for exact (date, amount) match

                    // Exact import_hash or exact label+comment match
                    if ($dOp['import_hash'] === $fOp['import_hash']) {
                        $score += 20;
                    } elseif ($dOp['label'] === $fOp['label'] && $dOp['comment'] === $fOp['comment']) {
                        $score += 20;
                    } elseif (!empty($dOp['comment']) && !empty($fOp['comment']) && (str_contains($dOp['comment'], $fOp['comment']) || str_contains($fOp['comment'], $dOp['comment']))) {
                        $score += 10;
                    }

                    // Neighbor Context Check
                    $dbPrev = $dIdx > 0 ? $dbOps[$dIdx - 1] : null;
                    $dbNext = $dIdx < (count($dbOps) - 1) ? $dbOps[$dIdx + 1] : null;

                    if ($filePrev && $dbPrev && abs($filePrev['amount'] - $dbPrev['amount']) < 0.001) {
                        $score += 10;
                    }
                    if ($fileNext && $dbNext && abs($fileNext['amount'] - $dbNext['amount']) < 0.001) {
                        $score += 10;
                    }

                    // DB Occurrence index
                    $dOccurrence = 0;
                    for ($k = 0; $k <= $dIdx; $k++) {
                        if ($dbOps[$k]['date'] === $dOp['date'] && abs($dbOps[$k]['amount'] - $dOp['amount']) < 0.001) {
                            $dOccurrence++;
                        }
                    }

                    if ($fOccurrence === $dOccurrence) {
                        $score += 10;
                    }

                    if ($score > $bestScore) {
                        $bestScore = $score;
                        $bestCandidateIdx = $dIdx;
                    }
                }

                if ($bestCandidateIdx !== null && $bestScore >= 60) {
                    // Matched with existing DB operation
                    $dbOps[$bestCandidateIdx]['matched'] = true;
                    $fOp['matched'] = true;
                    $skippedCount++;
                } elseif (in_array($fOp['import_hash'], $createdHashesInBatch, true)) {
                    // Intra-file duplicate of an already created operation in this batch
                    $fOp['matched'] = true;
                    $skippedCount++;
                } else {
                    // Check for Auto-Categorization Match
                    $autoCatMatch = $this->findAutoCategoryMatch($fOp['raw_bank_label'], $categorizedDbOps);

                    if ($autoCatMatch) {
                        Operation::create([
                            'date' => $fOp['date'],
                            'original_date' => $fOp['date'],
                            'label' => $autoCatMatch['label'],
                            'amount' => $fOp['amount'],
                            'comment' => null, // Clear raw bank text from comment for user
                            'expense_type_id' => $autoCatMatch['expense_type_id'],
                            'raw_bank_label' => $fOp['raw_bank_label'],
                            'import_hash' => $fOp['import_hash'],
                            'is_auto_categorized' => true,
                            'is_validated' => false,
                        ]);
                    } else {
                        Operation::create([
                            'date' => $fOp['date'],
                            'original_date' => $fOp['date'],
                            'label' => $fOp['label'],
                            'amount' => $fOp['amount'],
                            'comment' => $fOp['comment'],
                            'raw_bank_label' => $fOp['raw_bank_label'],
                            'import_hash' => $fOp['import_hash'],
                            'is_auto_categorized' => false,
                            'is_validated' => true,
                        ]);
                    }

                    $createdHashesInBatch[] = $fOp['import_hash'];
                    $importedCount++;
                }
            }

            DB::commit();

            return [
                'imported' => $importedCount,
                'skipped' => $skippedCount,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function findAutoCategoryMatch(?string $rawBankLabel, $categorizedDbOps): ?array
    {
        if (empty($rawBankLabel)) {
            return null;
        }

        $normInput = $this->normalizeBankLabel($rawBankLabel);
        if (empty($normInput)) {
            return null;
        }

        foreach ($categorizedDbOps as $pastOp) {
            $pastRaw = $pastOp->raw_bank_label ?: ($pastOp->comment ?: $pastOp->label);
            $normPast = $this->normalizeBankLabel($pastRaw);

            if (empty($normPast)) {
                continue;
            }

            // Exact match on normalized label
            if ($normInput === $normPast) {
                return [
                    'expense_type_id' => $pastOp->expense_type_id,
                    'label' => $pastOp->label,
                ];
            }

            // Substring / Keyword match (min 4 chars)
            if (mb_strlen($normPast) >= 4 && (str_contains($normInput, $normPast) || str_contains($normPast, $normInput))) {
                return [
                    'expense_type_id' => $pastOp->expense_type_id,
                    'label' => $pastOp->label,
                ];
            }
        }

        return null;
    }

    private function normalizeBankLabel(string $str): string
    {
        $s = mb_strtoupper(trim($str), 'UTF-8');

        // Remove dates (e.g. DU 19/08/26, 19/08/2026, 200826)
        $s = preg_replace('/\bDU\s+\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4}\b/u', '', $s);
        $s = preg_replace('/\b\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4}\b/u', '', $s);

        // Remove card patterns (e.g. CARTE*5621, CARTE 4974XXXXXXXX8761)
        $s = preg_replace('/CARTE\s*\*?\s*\d+/u', '', $s);
        $s = preg_replace('/CARTE\s+\d+X+\d+/u', '', $s);

        // Remove reference patterns (e.g. REF : XXX, ID EMETTEUR/XXX, MDT/XXX)
        $s = preg_replace('/REF\s*:\s*\S+/u', '', $s);
        $s = preg_replace('/ID\s+EMETTEUR\/\S+/u', '', $s);
        $s = preg_replace('/MDT\/\S+/u', '', $s);

        // Remove cities / location suffixes after " A " (e.g. " A QUINCY VOISIN")
        $s = preg_replace('/\bA\s+[A-Z\s-]+$/u', '', $s);

        // Clean extra spaces & punctuation
        $s = preg_replace('/[^\w\s]/u', ' ', $s);
        $s = preg_replace('/\s+/', ' ', $s);

        return trim($s);
    }

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

        if (is_numeric($value)) {
            try {
                return ExcelDate::excelToDateTimeObject($value)->format('Y-m-d');
            } catch (\Throwable $e) {}
        }

        $str = trim((string) $value);

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
