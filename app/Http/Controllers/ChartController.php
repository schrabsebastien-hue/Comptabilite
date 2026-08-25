<?php

namespace App\Http\Controllers;

use App\Models\ExpenseType;
use App\Models\Operation;
use App\Services\SynthesisCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ChartController extends Controller
{
    protected SynthesisCalculationService $calcService;

    public function __construct(SynthesisCalculationService $calcService)
    {
        $this->calcService = $calcService;
    }

    /**
     * Display the analytics and charts page.
     */
    public function index(Request $request): Response
    {
        // 1. Get all available years from operations
        $allYears = Operation::whereNotNull('date')
            ->selectRaw('substr(date, 1, 4) as year_val')
            ->distinct()
            ->orderBy('year_val', 'desc')
            ->pluck('year_val')
            ->map(fn($y) => (int) $y)
            ->filter(fn($y) => $y > 1900 && $y < 2100)
            ->values()
            ->toArray();

        $currentSystemYear = (int) date('Y');

        if (empty($allYears)) {
            $allYears = [$currentSystemYear];
        }

        // Determine active year
        $requestedYear = $request->input('year');
        $selectedYear = $requestedYear ? (int) $requestedYear : ($allYears[0] ?? $currentSystemYear);

        if (!in_array($selectedYear, $allYears)) {
            $allYears[] = $selectedYear;
            rsort($allYears);
        }

        // 2. Fetch all expense types
        $expenseTypes = ExpenseType::orderBy('position')->orderBy('name')->get();
        $expenseTypesMap = $expenseTypes->keyBy('id');

        // 3. Fetch operations for the selected year
        $startDate = "{$selectedYear}-01-01";
        $endDate = "{$selectedYear}-12-31";

        $operations = Operation::with('expenseType')
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date', 'asc')
            ->get();

        // 4. Aggregate data per category (for global view)
        $dataByType = [];
        $uncategorizedExpenses = 0.0;
        $uncategorizedCredits = 0.0;
        $uncategorizedCount = 0;
        $uncategorizedMonthlyDebits = array_fill(1, 12, 0.0);
        $uncategorizedMonthlyCredits = array_fill(1, 12, 0.0);

        foreach ($expenseTypes as $type) {
            $dataByType[$type->id] = [
                'id' => $type->id,
                'name' => $type->name,
                'color' => $type->color ?: '#6366f1',
                'position' => $type->position ?? 0,
                'total_debits' => 0.0,
                'total_credits' => 0.0,
                'operations_count' => 0,
                'monthly_debits' => array_fill(1, 12, 0.0),
                'monthly_credits' => array_fill(1, 12, 0.0),
            ];
        }

        $totalYearDebits = 0.0;
        $totalYearCredits = 0.0;

        foreach ($operations as $op) {
            $amount = (float) $op->amount;
            $month = (int) date('n', strtotime($op->date));
            $typeId = $op->expense_type_id;

            if ($amount < 0) {
                $debitAmount = abs($amount);
                $totalYearDebits += $debitAmount;

                if ($typeId && isset($dataByType[$typeId])) {
                    $dataByType[$typeId]['total_debits'] += $debitAmount;
                    $dataByType[$typeId]['monthly_debits'][$month] += $debitAmount;
                    $dataByType[$typeId]['operations_count']++;
                } else {
                    $uncategorizedExpenses += $debitAmount;
                    $uncategorizedMonthlyDebits[$month] += $debitAmount;
                    $uncategorizedCount++;
                }
            } else {
                $creditAmount = $amount;
                $totalYearCredits += $creditAmount;

                if ($typeId && isset($dataByType[$typeId])) {
                    $dataByType[$typeId]['total_credits'] += $creditAmount;
                    $dataByType[$typeId]['monthly_credits'][$month] += $creditAmount;
                    $dataByType[$typeId]['operations_count']++;
                } else {
                    $uncategorizedCredits += $creditAmount;
                    $uncategorizedMonthlyCredits[$month] += $creditAmount;
                    $uncategorizedCount++;
                }
            }
        }

        // Build list of categories with classification
        $categoriesStats = [];
        foreach ($dataByType as $item) {
            $debits = round($item['total_debits'], 2);
            $credits = round($item['total_credits'], 2);

            $isRevenue = ($credits > $debits);
            $displayAmount = $isRevenue ? $credits : $debits;

            $percentage = 0.0;
            if ($isRevenue && $totalYearCredits > 0) {
                $percentage = round(($credits / $totalYearCredits) * 100, 2);
            } elseif (!$isRevenue && $totalYearDebits > 0) {
                $percentage = round(($debits / $totalYearDebits) * 100, 2);
            }

            $roundedMonthlyDebits = [];
            $roundedMonthlyCredits = [];
            $roundedMonthlyDisplay = [];
            for ($m = 1; $m <= 12; $m++) {
                $mDeb = round($item['monthly_debits'][$m], 2);
                $mCr = round($item['monthly_credits'][$m], 2);
                $roundedMonthlyDebits[$m] = $mDeb;
                $roundedMonthlyCredits[$m] = $mCr;
                $roundedMonthlyDisplay[$m] = $isRevenue ? $mCr : $mDeb;
            }

            $isInternalTransfer = Str::contains(mb_strtolower($item['name']), 'virement interne');

            $categoriesStats[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'color' => $item['color'],
                'position' => $item['position'],
                'type' => $isRevenue ? 'revenue' : 'expense',
                'display_amount' => $displayAmount,
                'total_debits' => $debits,
                'total_credits' => $credits,
                'percentage' => $percentage,
                'operations_count' => $item['operations_count'],
                'monthly_amounts' => $roundedMonthlyDisplay,
                'monthly_debits' => $roundedMonthlyDebits,
                'monthly_credits' => $roundedMonthlyCredits,
                'is_uncategorized' => false,
                'is_internal_transfer' => $isInternalTransfer,
            ];
        }

        if ($uncategorizedExpenses > 0 || $uncategorizedCredits > 0 || $uncategorizedCount > 0) {
            $isRevenue = ($uncategorizedCredits > $uncategorizedExpenses);
            $displayAmount = $isRevenue ? round($uncategorizedCredits, 2) : round($uncategorizedExpenses, 2);
            $percentage = 0.0;
            if ($isRevenue && $totalYearCredits > 0) {
                $percentage = round(($uncategorizedCredits / $totalYearCredits) * 100, 2);
            } elseif (!$isRevenue && $totalYearDebits > 0) {
                $percentage = round(($uncategorizedExpenses / $totalYearDebits) * 100, 2);
            }

            $roundedMonthlyDisplay = [];
            for ($m = 1; $m <= 12; $m++) {
                $roundedMonthlyDisplay[$m] = $isRevenue ? round($uncategorizedMonthlyCredits[$m], 2) : round($uncategorizedMonthlyDebits[$m], 2);
            }

            $categoriesStats[] = [
                'id' => 'uncategorized',
                'name' => 'Non catégorisé',
                'color' => '#94a3b8',
                'position' => 99999,
                'type' => $isRevenue ? 'revenue' : 'expense',
                'display_amount' => $displayAmount,
                'total_debits' => round($uncategorizedExpenses, 2),
                'total_credits' => round($uncategorizedCredits, 2),
                'percentage' => $percentage,
                'operations_count' => $uncategorizedCount,
                'monthly_amounts' => $roundedMonthlyDisplay,
                'monthly_debits' => array_map(fn($v) => round($v, 2), $uncategorizedMonthlyDebits),
                'monthly_credits' => array_map(fn($v) => round($v, 2), $uncategorizedMonthlyCredits),
                'is_uncategorized' => true,
                'is_internal_transfer' => false,
            ];
        }

        // 5. Build Monthly Stacked Charts Data from Synthesis Calculation
        $synthesisData = $this->calcService->computeSynthesis($selectedYear);
        $rules = $synthesisData['rules'];
        $calculatedRows = $synthesisData['calculatedRows'];
        $totalsBySection = $synthesisData['totalsBySection'];

        // Distinct colors palette for synthesis rows
        $paletteChargesFixes = [
            '#eab308', // SOFIAP (yellow/gold)
            '#16a34a', // Dons assemblée (green)
            '#f97316', // Provision impôts (orange)
            '#06b6d4', // Assurance / Prov entretien (cyan)
            '#ef4444', // Complémentaire Pauline (red)
            '#3b82f6', // Frais bancaires (blue)
            '#8b5cf6', // Téléphonie + fibre (purple)
            '#14b8a6', // Eau (teal)
            '#ec4899', // EDF (pink)
            '#6366f1', // ENGIE (indigo)
            '#f43f5e', // Remboursement BNP (rose)
            '#a855f7', // Assurances prêt immo
            '#10b981', // Prov fortuit
            '#f59e0b', // Prov assurance
            '#64748b', // Other
        ];

        $paletteChargesVariables = [
            '#f97316', // Total/principal (orange)
            '#ef4444', // Alimentation (red)
            '#eab308', // Achats divers (yellow)
            '#16a34a', // Transports (green)
            '#3b82f6', // Retrait liquidité (blue)
            '#8b5cf6', // Other
            '#ec4899',
            '#06b6d4',
        ];

        $paletteRevenus = [
            '#3b82f6', // Salaire Sébastien (blue)
            '#ef4444', // 13ème mois Sébastien (red)
            '#f59e0b', // Salaire Pauline (amber/orange)
            '#10b981', // Revenu exceptionnel (emerald)
            '#8b5cf6', // Other
        ];

        $paletteEncours = [
            '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'
        ];

        $buildSectionChartData = function ($sectionKey, $sectionTitle, $palette, $isNegative = true) use ($rules, $calculatedRows, $totalsBySection, $expenseTypesMap) {
            $sectionRules = $rules->where('section', $sectionKey);
            $datasets = [];
            $colorIdx = 0;

            foreach ($sectionRules as $r) {
                $rowId = $r->row_id;
                $rowData = $calculatedRows[$rowId] ?? null;
                if (!$rowData) continue;

                $balances = $rowData['balances'] ?? [];
                // Check if row has any non-zero value
                $hasValues = false;
                $monthlyData = [];

                for ($m = 1; $m <= 12; $m++) {
                    $val = $balances[$m] ?? 0.0;
                    if ($val !== null && abs($val) > 0.001) {
                        $hasValues = true;
                    }
                    // Format for chart: negative if charges, positive if revenues
                    if ($val === null) {
                        $monthlyData[] = 0.0;
                    } else {
                        $num = (float) $val;
                        if ($isNegative && $num > 0) {
                            $num = -$num;
                        } elseif (!$isNegative && $num < 0) {
                            $num = abs($num);
                        }
                        $monthlyData[] = round($num, 2);
                    }
                }

                // If completely 0, we can still include it or skip
                $color = $palette[$colorIdx % count($palette)];
                $colorIdx++;

                $datasets[] = [
                    'row_id' => $rowId,
                    'label' => $r->label,
                    'color' => $color,
                    'is_provision' => (bool) $r->is_provision,
                    'data' => $monthlyData,
                ];
            }

            // Totals per month
            $monthlyTotals = [];
            for ($m = 1; $m <= 12; $m++) {
                $tot = $totalsBySection[$sectionKey][$m] ?? 0.0;
                if ($tot === null) {
                    $monthlyTotals[] = 0.0;
                } else {
                    $num = (float) $tot;
                    if ($isNegative && $num > 0) {
                        $num = -$num;
                    } elseif (!$isNegative && $num < 0) {
                        $num = abs($num);
                    }
                    $monthlyTotals[] = round($num, 2);
                }
            }

            return [
                'section_key' => $sectionKey,
                'section_title' => $sectionTitle,
                'is_negative' => $isNegative,
                'datasets' => $datasets,
                'monthly_totals' => $monthlyTotals,
            ];
        };

        $monthlyCharts = [
            'charges_fixes' => $buildSectionChartData('charges_fixes', 'Charges fixes', $paletteChargesFixes, true),
            'charges_variables' => $buildSectionChartData('charges_variables', 'Charges variables', $paletteChargesVariables, true),
            'revenus' => $buildSectionChartData('revenus', 'Revenus', $paletteRevenus, false),
            'encours_provisions' => $buildSectionChartData('encours_provisions', 'Encours et provisions', $paletteEncours, false),
        ];

        // Global KPIs
        $expensesList = array_filter($categoriesStats, fn($c) => $c['type'] === 'expense' && $c['display_amount'] > 0);
        $revenuesList = array_filter($categoriesStats, fn($c) => $c['type'] === 'revenue' && $c['display_amount'] > 0);

        $topExpense = !empty($expensesList) ? collect($expensesList)->sortByDesc('display_amount')->first() : null;
        $topRevenue = !empty($revenuesList) ? collect($revenuesList)->sortByDesc('display_amount')->first() : null;

        $maxMonths = ($selectedYear === $currentSystemYear) ? max(1, (int) date('n')) : 12;
        $monthlyAverageExpense = $maxMonths > 0 ? round($totalYearDebits / $maxMonths, 2) : 0.0;
        $monthlyAverageRevenue = $maxMonths > 0 ? round($totalYearCredits / $maxMonths, 2) : 0.0;

        return Inertia::render('Graphiques/Index', [
            'selectedYear' => $selectedYear,
            'availableYears' => $allYears,
            'categoriesStats' => $categoriesStats,
            'monthlyCharts' => $monthlyCharts,
            'summaryStats' => [
                'totalYearExpenses' => round($totalYearDebits, 2),
                'totalYearCredits' => round($totalYearCredits, 2),
                'netBalance' => round($totalYearCredits - $totalYearDebits, 2),
                'totalOperationsCount' => $operations->count(),
                'activeCategoriesCount' => count(array_filter($categoriesStats, fn($c) => $c['display_amount'] > 0)),
                'monthlyAverageExpense' => $monthlyAverageExpense,
                'monthlyAverageRevenue' => $monthlyAverageRevenue,
                'topExpense' => $topExpense ? [
                    'name' => $topExpense['name'],
                    'amount' => $topExpense['display_amount'],
                    'percentage' => $topExpense['percentage'],
                    'color' => $topExpense['color'],
                ] : null,
                'topRevenue' => $topRevenue ? [
                    'name' => $topRevenue['name'],
                    'amount' => $topRevenue['display_amount'],
                    'percentage' => $topRevenue['percentage'],
                    'color' => $topRevenue['color'],
                ] : null,
            ],
        ]);
    }
}
