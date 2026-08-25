<?php

namespace App\Services;

use App\Models\ExpenseType;
use App\Models\Operation;
use App\Models\SynthesisManualValue;
use App\Models\SynthesisRowRule;
use Illuminate\Support\Str;

class SynthesisCalculationService
{
    /**
     * Get or seed default row rules.
     */
    public function getRules()
    {
        $count = SynthesisRowRule::count();
        if ($count === 0) {
            $this->seedDefaultRules();
        } else {
            if (!SynthesisRowRule::where('row_id', 'reste_a_vivre')->exists()) {
                SynthesisRowRule::create([
                    'row_id' => 'reste_a_vivre',
                    'label' => 'Reste à vivre',
                    'section' => 'indicateurs',
                    'calculation_type' => 'monthly_operations_sum',
                    'calculation_config' => [
                        'carry_previous_month' => false,
                        'modules' => [
                            ['id' => 'm1', 'operator' => '+', 'source_type' => 'section_total', 'source_id' => 'total_revenus'],
                            ['id' => 'm2', 'operator' => '-', 'source_type' => 'section_total', 'source_id' => 'total_charges_mois'],
                        ]
                    ],
                    'position' => 100,
                ]);
            }
        }

        $rules = SynthesisRowRule::orderBy('position')->get();

        // Ensure calculation_config is populated on all rules for backward compatibility
        foreach ($rules as $rule) {
            if (empty($rule->calculation_config)) {
                $rule->calculation_config = $this->convertLegacyRuleToConfig($rule);
                $rule->save();
            }
        }

        return $rules;
    }

    /**
     * Convert legacy rule fields into modular calculation_config.
     */
    public function convertLegacyRuleToConfig(SynthesisRowRule $rule): array
    {
        $modules = [];

        if ($rule->calculation_type === 'cumulative_encours') {
            $carry = true;

            if ($rule->provision_row_id) {
                $modules[] = [
                    'id' => 'mod_prov_' . $rule->provision_row_id,
                    'operator' => '+',
                    'source_type' => 'synthesis_row',
                    'source_id' => $rule->provision_row_id,
                ];
            }

            if (!empty($rule->deducted_row_ids)) {
                foreach ($rule->deducted_row_ids as $dId) {
                    $modules[] = [
                        'id' => 'mod_ded_' . $dId,
                        'operator' => '-',
                        'source_type' => 'synthesis_row',
                        'source_id' => $dId,
                    ];
                }
            }

            if (!empty($rule->expense_type_ids)) {
                foreach ($rule->expense_type_ids as $eId) {
                    $modules[] = [
                        'id' => 'mod_exp_' . $eId,
                        'operator' => '+',
                        'source_type' => 'expense_type',
                        'source_id' => (int) $eId,
                    ];
                }
            }

            return [
                'carry_previous_month' => $carry,
                'modules' => $modules,
            ];
        }

        if ($rule->calculation_type === 'monthly_operations_sum') {
            if (!empty($rule->expense_type_ids)) {
                foreach ($rule->expense_type_ids as $eId) {
                    $modules[] = [
                        'id' => 'mod_exp_' . $eId,
                        'operator' => '+',
                        'source_type' => 'expense_type',
                        'source_id' => (int) $eId,
                    ];
                }
            }

            return [
                'carry_previous_month' => false,
                'modules' => $modules,
            ];
        }

        // Manual
        return [
            'carry_previous_month' => false,
            'modules' => [],
        ];
    }

    /**
     * Seed initial default rules matching standard template.
     */
    public function seedDefaultRules()
    {
        $expenseTypesByName = ExpenseType::all()->keyBy(function ($item) {
            return Str::slug($item->name, '');
        });

        $findId = function ($slug) use ($expenseTypesByName) {
            return isset($expenseTypesByName[$slug]) ? $expenseTypesByName[$slug]->id : null;
        };

        $rules = [
            // 1. Encours et provisions
            [
                'row_id' => 'fortuit',
                'label' => 'Fortuit',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => [
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'synthesis_row', 'source_id' => 'prov_fortuit'],
                    ]
                ],
                'position' => 1,
            ],
            [
                'row_id' => 'dons',
                'label' => 'Dons',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => array_values(array_filter([
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'synthesis_row', 'source_id' => 'prov_dons'],
                        $findId('dons') ? ['id' => 'm2', 'operator' => '+', 'source_type' => 'expense_type', 'source_id' => $findId('dons')] : null,
                    ]))
                ],
                'position' => 2,
            ],
            [
                'row_id' => 'impots',
                'label' => 'Impôts',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => array_values(array_filter([
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'synthesis_row', 'source_id' => 'prov_impots'],
                        $findId('impots') ? ['id' => 'm2', 'operator' => '+', 'source_type' => 'expense_type', 'source_id' => $findId('impots')] : null,
                    ]))
                ],
                'position' => 3,
            ],
            [
                'row_id' => 'entretien_voiture',
                'label' => 'Entretien voiture',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => array_values(array_filter([
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'synthesis_row', 'source_id' => 'prov_entretien_voiture'],
                        $findId('entretienvoiture') ? ['id' => 'm2', 'operator' => '+', 'source_type' => 'expense_type', 'source_id' => $findId('entretienvoiture')] : null,
                    ]))
                ],
                'position' => 4,
            ],
            [
                'row_id' => 'assurance',
                'label' => 'Assurance',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => array_values(array_filter([
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'synthesis_row', 'source_id' => 'prov_assurance'],
                        $findId('assurance') ? ['id' => 'm2', 'operator' => '+', 'source_type' => 'expense_type', 'source_id' => $findId('assurance')] : null,
                    ]))
                ],
                'position' => 5,
            ],
            [
                'row_id' => 'entretien_maison',
                'label' => 'Entretien maison',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => array_values(array_filter([
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'synthesis_row', 'source_id' => 'prov_entretien_maison'],
                        $findId('entretienmaison') ? ['id' => 'm2', 'operator' => '+', 'source_type' => 'expense_type', 'source_id' => $findId('entretienmaison')] : null,
                    ]))
                ],
                'position' => 6,
            ],
            [
                'row_id' => '13eme_mois',
                'label' => '13ème mois',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => [
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'synthesis_row', 'source_id' => 'prov_13eme_mois'],
                        ['id' => 'm2', 'operator' => '-', 'source_type' => 'synthesis_row', 'source_id' => '13eme_mois_sebastien'],
                    ]
                ],
                'position' => 7,
            ],
            [
                'row_id' => 'economies',
                'label' => 'Economies',
                'section' => 'encours_provisions',
                'calculation_type' => 'cumulative_encours',
                'calculation_config' => [
                    'carry_previous_month' => true,
                    'modules' => array_values(array_filter([
                        $findId('revenuexceptionnel') ? ['id' => 'm1', 'operator' => '+', 'source_type' => 'expense_type', 'source_id' => $findId('revenuexceptionnel')] : null,
                        $findId('depensesexceptionnelles') ? ['id' => 'm2', 'operator' => '+', 'source_type' => 'expense_type', 'source_id' => $findId('depensesexceptionnelles')] : null,
                    ]))
                ],
                'position' => 8,
            ],

            // 2. Charges fixes
            [
                'row_id' => 'frais_bancaires',
                'label' => 'Frais bancaires',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 10,
            ],
            [
                'row_id' => 'complementaire_pauline',
                'label' => 'Complémentaire Pauline',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 11,
            ],
            [
                'row_id' => 'telephonie_fibre',
                'label' => 'Téléphonie + fibre',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 12,
            ],
            [
                'row_id' => 'dons_assemblee',
                'label' => 'Dons assemblée',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 13,
            ],
            [
                'row_id' => 'edf',
                'label' => 'EDF',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 14,
            ],
            [
                'row_id' => 'engie',
                'label' => 'ENGIE',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 15,
            ],
            [
                'row_id' => 'eau',
                'label' => 'Eau',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 16,
            ],
            [
                'row_id' => 'remboursement_pret_bnp',
                'label' => 'Remboursement prêt BNP',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 17,
            ],
            [
                'row_id' => 'remboursement_pret_sofiap',
                'label' => 'Remboursement prêt SOFIAP',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 18,
            ],
            [
                'row_id' => 'assurances_pret_immo',
                'label' => 'Assurances prêt immobilier',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 19,
            ],
            // Provisions (italiques)
            [
                'row_id' => 'prov_fortuit',
                'label' => 'Provision fortuit',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'is_provision' => true,
                'is_italic' => true,
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 20,
            ],
            [
                'row_id' => 'prov_dons',
                'label' => 'Provision dons',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'is_provision' => true,
                'is_italic' => true,
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 21,
            ],
            [
                'row_id' => 'prov_impots',
                'label' => 'Provision impôts',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'is_provision' => true,
                'is_italic' => true,
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 22,
            ],
            [
                'row_id' => 'prov_entretien_voiture',
                'label' => 'Provision entretien voiture',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'is_provision' => true,
                'is_italic' => true,
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 23,
            ],
            [
                'row_id' => 'prov_assurance',
                'label' => 'Provision assurance',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'is_provision' => true,
                'is_italic' => true,
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 24,
            ],
            [
                'row_id' => 'prov_entretien_maison',
                'label' => 'Provision entretien maison',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'is_provision' => true,
                'is_italic' => true,
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 25,
            ],
            [
                'row_id' => 'prov_13eme_mois',
                'label' => 'Provision 13ème mois',
                'section' => 'charges_fixes',
                'calculation_type' => 'manual',
                'is_provision' => true,
                'is_italic' => true,
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 26,
            ],

            // 3. Charges variables
            [
                'row_id' => 'retrait_liquidite',
                'label' => 'Retrait liquidité',
                'section' => 'charges_variables',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 30,
            ],
            [
                'row_id' => 'alimentation',
                'label' => 'Alimentation',
                'section' => 'charges_variables',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 31,
            ],
            [
                'row_id' => 'achats_divers',
                'label' => 'Achats divers',
                'section' => 'charges_variables',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 32,
            ],
            [
                'row_id' => 'transports',
                'label' => 'Transports',
                'section' => 'charges_variables',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 33,
            ],

            // 4. Revenus
            [
                'row_id' => 'salaire_sebastien',
                'label' => 'Salaire Sébastien',
                'section' => 'revenus',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 40,
            ],
            [
                'row_id' => '13eme_mois_sebastien',
                'label' => '13ème mois Sébastien',
                'section' => 'revenus',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 41,
            ],
            [
                'row_id' => 'salaire_pauline',
                'label' => 'Salaire Pauline',
                'section' => 'revenus',
                'calculation_type' => 'manual',
                'calculation_config' => ['carry_previous_month' => false, 'modules' => []],
                'position' => 42,
            ],

            // 5. Indicateurs
            [
                'row_id' => 'reste_a_vivre',
                'label' => 'Reste à vivre',
                'section' => 'indicateurs',
                'calculation_type' => 'monthly_operations_sum',
                'calculation_config' => [
                    'carry_previous_month' => false,
                    'modules' => [
                        ['id' => 'm1', 'operator' => '+', 'source_type' => 'section_total', 'source_id' => 'total_revenus'],
                        ['id' => 'm2', 'operator' => '-', 'source_type' => 'section_total', 'source_id' => 'total_charges_mois'],
                    ]
                ],
                'position' => 100,
            ],
        ];

        foreach ($rules as $r) {
            SynthesisRowRule::updateOrCreate(
                ['row_id' => $r['row_id']],
                $r
            );
        }
    }

    /**
     * Compute the full synthesis data for a given year.
     */
    public function computeSynthesis(int $year)
    {
        $currentSystemYear = (int) date('Y');
        $currentSystemMonth = (int) date('n');

        // 1. Get all rules and expense types
        $rules = $this->getRules();
        $expenseTypes = ExpenseType::orderBy('position')->orderBy('name')->get();
        $expenseTypesMap = $expenseTypes->keyBy('id');
        $ruleMap = $rules->keyBy('row_id');

        // 2. Load manual values for year - 1 and current year
        $manualValuesRaw = SynthesisManualValue::whereIn('year', [$year - 1, $year])->get();
        $manualValues = [];
        foreach ($manualValuesRaw as $mv) {
            $manualValues[$mv->year][$mv->row_id][$mv->month] = (float) $mv->value;
        }

        // 3. Load operations for year - 1 and year
        $operations = Operation::with('expenseType')
            ->whereYear('date', '>=', $year - 1)
            ->whereYear('date', '<=', $year)
            ->orderBy('date')
            ->get();

        // Index operations by year, month, and expense_type_id
        $opsIndex = []; // [year][month][expense_type_id] = [ ops... ]
        foreach ($operations as $op) {
            $opYear = (int) date('Y', strtotime($op->date));
            $opMonth = (int) date('n', strtotime($op->date));
            $typeId = $op->expense_type_id ?? 0;

            if (!isset($opsIndex[$opYear][$opMonth][$typeId])) {
                $opsIndex[$opYear][$opMonth][$typeId] = [];
            }
            $dateStr = $op->date instanceof \DateTimeInterface ? $op->date->format('Y-m-d') : substr((string) $op->date, 0, 10);
            $opsIndex[$opYear][$opMonth][$typeId][] = [
                'id' => $op->id,
                'date' => $dateStr,
                'label' => $op->label,
                'amount' => (float) $op->amount,
                'comment' => $op->comment,
                'expense_type_id' => $typeId,
                'expense_type_name' => $op->expenseType ? $op->expenseType->name : 'Sans catégorie',
            ];
        }

        // Helper to get operations for a specific expense_type_id in year & month
        $getOpsForType = function ($targetYear, $targetMonth, $expenseTypeId) use ($opsIndex) {
            if (!isset($opsIndex[$targetYear][$targetMonth][$expenseTypeId])) {
                return ['operations' => [], 'sum' => 0.0];
            }
            $ops = $opsIndex[$targetYear][$targetMonth][$expenseTypeId];
            $sum = array_sum(array_column($ops, 'amount'));
            return ['operations' => $ops, 'sum' => $sum];
        };

        // 4. Multi-pass calculation of all rows
        $calculatedRows = []; // [row_id] => [ balances => [1..12], audits => [1..12], initial_balance, ... ]
        $totalsBySection = [
            'encours_provisions' => array_fill(1, 12, null),
            'charges_fixes' => array_fill(1, 12, null),
            'charges_variables' => array_fill(1, 12, null),
            'revenus' => array_fill(1, 12, null),
        ];

        // Helper to evaluate synthesis totals (Total charges fixes, variables, mois, revenus, reste a vivre)
        $computeIntermediateTotals = function ($targetYear, $m) use ($rules, &$calculatedRows, $manualValues) {
            $fixes = 0.0;
            $variables = 0.0;
            $revenus = 0.0;
            $encours = 0.0;

            foreach ($rules as $r) {
                $rId = $r->row_id;
                if ($rId === 'reste_a_vivre' || $r->section === 'indicateurs') continue;

                $val = 0.0;
                if (isset($manualValues[$targetYear][$rId][$m])) {
                    $val = (float) $manualValues[$targetYear][$rId][$m];
                } elseif (isset($calculatedRows[$rId]['balances'][$m])) {
                    $val = (float) ($calculatedRows[$rId]['balances'][$m] ?? 0.0);
                }

                if ($r->section === 'charges_fixes') $fixes += $val;
                if ($r->section === 'charges_variables') $variables += $val;
                if ($r->section === 'revenus') $revenus += $val;
                if ($r->section === 'encours_provisions') $encours += $val;
            }

            $chargesMois = $fixes + $variables;
            $resteAVivre = isset($calculatedRows['reste_a_vivre']['balances'][$m]) && $calculatedRows['reste_a_vivre']['balances'][$m] !== null
                ? (float) $calculatedRows['reste_a_vivre']['balances'][$m]
                : ($revenus - $chargesMois);

            return [
                'charges_fixes' => $fixes,
                'charges_variables' => $variables,
                'total_charges_mois' => $chargesMois,
                'revenus' => $revenus,
                'total_revenus' => $revenus,
                'total_charges_fixes' => $fixes,
                'total_charges_variables' => $variables,
                'total_encours_provisions' => $encours,
                'encours_provisions' => $encours,
                'reste_a_vivre' => $resteAVivre,
            ];
        };

        // Helper to get value of any source for targetYear & month
        $resolveSourceValue = function ($targetYear, $m, $mod) use ($rules, $ruleMap, $expenseTypesMap, $manualValues, &$calculatedRows, $getOpsForType, $computeIntermediateTotals) {
            $sourceType = $mod['source_type'] ?? 'synthesis_row';
            $sourceId = $mod['source_id'] ?? null;

            if ($sourceType === 'expense_type') {
                $eData = $getOpsForType($targetYear, $m, (int) $sourceId);
                $sourceLabel = isset($expenseTypesMap[$sourceId]) ? $expenseTypesMap[$sourceId]->name : 'Dépense #' . $sourceId;
                return [
                    'value' => $eData['sum'],
                    'label' => $sourceLabel,
                    'operations' => $eData['operations'],
                ];
            }

            // Section Totals & Special Indicators
            $sectionTotalLabels = [
                'total_revenus' => 'Total des revenus',
                'revenus' => 'Total des revenus',
                'total_charges_mois' => 'Total des charges du mois',
                'total_charges_fixes' => 'Total des charges fixes',
                'charges_fixes' => 'Total des charges fixes',
                'total_charges_variables' => 'Total des charges variables',
                'charges_variables' => 'Total des charges variables',
                'total_encours_provisions' => 'Total Encours et provisions',
                'encours_provisions' => 'Total Encours et provisions',
                'reste_a_vivre' => 'Reste à vivre',
            ];

            if ($sourceType === 'section_total' || isset($sectionTotalLabels[$sourceId])) {
                $tots = $computeIntermediateTotals($targetYear, $m);
                $valKey = $sourceId;
                if ($sourceId === 'total_revenus') $valKey = 'revenus';
                if ($sourceId === 'total_charges_fixes') $valKey = 'charges_fixes';
                if ($sourceId === 'total_charges_variables') $valKey = 'charges_variables';
                if ($sourceId === 'total_encours_provisions') $valKey = 'encours_provisions';

                $val = (float) ($tots[$valKey] ?? 0.0);
                $lbl = $sectionTotalLabels[$sourceId] ?? $sourceId;
                return [
                    'value' => $val,
                    'label' => $lbl,
                    'operations' => [],
                ];
            }

            // Standard synthesis row
            $val = 0.0;
            if (isset($manualValues[$targetYear][$sourceId][$m])) {
                $val = (float) $manualValues[$targetYear][$sourceId][$m];
            } elseif (isset($calculatedRows[$sourceId]['balances'][$m])) {
                $val = (float) ($calculatedRows[$sourceId]['balances'][$m] ?? 0.0);
            }

            if (str_starts_with((string) $sourceId, 'prov_')) {
                $val = abs($val);
            }

            $sourceLabel = isset($ruleMap[$sourceId]) ? $ruleMap[$sourceId]->label : $sourceId;

            return [
                'value' => $val,
                'label' => $sourceLabel,
                'operations' => [],
            ];
        };

        // Helper to compute a single non-cumulative modular row
        $computeNonCumulativeRow = function ($rule) use ($year, $currentSystemYear, $currentSystemMonth, $manualValues, $resolveSourceValue, &$calculatedRows) {
            $config = $rule->calculation_config ?? $this->convertLegacyRuleToConfig($rule);
            $modules = $config['modules'] ?? [];
            $rowId = $rule->row_id;
            $monthlyBalances = [];
            $monthlyAudits = [];

            if (empty($modules)) {
                // Pure manual entry
                for ($m = 1; $m <= 12; $m++) {
                    $isFuture = ($year > $currentSystemYear) || ($year === $currentSystemYear && $m > $currentSystemMonth);
                    $manualVal = $manualValues[$year][$rowId][$m] ?? null;

                    $monthlyBalances[$m] = $manualVal;
                    $monthlyAudits[$m] = [
                        'is_future' => $isFuture,
                        'calc_type' => 'manual',
                        'label' => $rule->label,
                        'month' => $m,
                        'manual_value' => $manualVal,
                        'formula_text' => $manualVal !== null 
                            ? 'Valeur saisie manuellement : ' . number_format($manualVal, 2, ',', ' ') . ' €' 
                            : 'Aucune valeur saisie (Saisie manuelle)',
                        'breakdown_items' => [],
                        'operations' => [],
                        'operations_sum' => 0.0,
                    ];
                }
            } else {
                // Monthly modular computation (without carry)
                for ($m = 1; $m <= 12; $m++) {
                    $isFuture = ($year > $currentSystemYear) || ($year === $currentSystemYear && $m > $currentSystemMonth);

                    if ($isFuture) {
                        $monthlyBalances[$m] = null;
                        $monthlyAudits[$m] = [
                            'is_future' => true,
                            'calc_type' => 'modular_monthly',
                            'label' => $rule->label,
                            'month' => $m,
                        ];
                    } else {
                        $monthSum = 0.0;
                        $breakdown = [];
                        $allOps = [];
                        $formulaParts = [];

                        foreach ($modules as $mod) {
                            $op = $mod['operator'] ?? '+';
                            $res = $resolveSourceValue($year, $m, $mod);
                            $val = $res['value'];
                            $sourceLabel = $res['label'];
                            $itemOps = $res['operations'];
                            if (!empty($itemOps)) {
                                $allOps = array_merge($allOps, $itemOps);
                            }

                            if ($op === '-') {
                                $monthSum -= $val;
                                $formulaParts[] = '- ' . $sourceLabel . ' (' . number_format($val, 2, ',', ' ') . ' €)';
                            } else {
                                $monthSum += $val;
                                $formulaParts[] = '+ ' . $sourceLabel . ' (' . number_format($val, 2, ',', ' ') . ' €)';
                            }

                            $breakdown[] = [
                                'operator' => $op,
                                'source_type' => $mod['source_type'] ?? 'synthesis_row',
                                'source_label' => $sourceLabel,
                                'value' => $val,
                            ];
                        }

                        $monthlyBalances[$m] = round($monthSum, 2);
                        $monthlyAudits[$m] = [
                            'is_future' => false,
                            'calc_type' => 'modular_monthly',
                            'label' => $rule->label,
                            'month' => $m,
                            'final_balance' => round($monthSum, 2),
                            'breakdown_items' => $breakdown,
                            'formula_text' => implode(' ', $formulaParts),
                            'operations' => $allOps,
                            'operations_sum' => round(array_sum(array_column($allOps, 'amount')), 2),
                        ];
                    }
                }
            }

            $calculatedRows[$rowId] = [
                'rule' => $rule,
                'balances' => $monthlyBalances,
                'audits' => $monthlyAudits,
            ];
        };

        // Helper to compute a single cumulative row (carry_previous_month = true)
        $computeCumulativeRow = function ($rule) use ($year, $currentSystemYear, $currentSystemMonth, $manualValues, $resolveSourceValue, &$calculatedRows) {
            $config = $rule->calculation_config ?? $this->convertLegacyRuleToConfig($rule);
            $rowId = $rule->row_id;
            $modules = $config['modules'] ?? [];

            // A. Calculate for year - 1 (to find December N-1 closing balance)
            $decPrevYearBalance = null;
            if (isset($manualValues[$year - 1])) {
                $runningPrev = $manualValues[$year - 1][$rowId][0] ?? 0.0;
                for ($m = 1; $m <= 12; $m++) {
                    $monthDelta = 0.0;
                    foreach ($modules as $mod) {
                        $res = $resolveSourceValue($year - 1, $m, $mod);
                        if (($mod['operator'] ?? '+') === '-') {
                            $monthDelta -= $res['value'];
                        } else {
                            $monthDelta += $res['value'];
                        }
                    }
                    $runningPrev += $monthDelta;
                }
                $decPrevYearBalance = $runningPrev;
            }

            // B. Calculate for current year
            $hasManualInitial = isset($manualValues[$year][$rowId][0]);
            $initialBalance = $hasManualInitial
                ? (float) $manualValues[$year][$rowId][0]
                : ($decPrevYearBalance ?? 0.0);

            $monthlyBalances = [];
            $monthlyAudits = [];
            $running = $initialBalance;

            for ($m = 1; $m <= 12; $m++) {
                $isFuture = ($year > $currentSystemYear) || ($year === $currentSystemYear && $m > $currentSystemMonth);

                if ($isFuture) {
                    $monthlyBalances[$m] = null;
                    $monthlyAudits[$m] = [
                        'is_future' => true,
                        'calc_type' => 'cumulative_encours',
                        'label' => $rule->label,
                        'month' => $m,
                    ];
                } else {
                    $prevBal = $running;
                    $breakdown = [];
                    $allOps = [];
                    $formulaParts = ['Solde M-1 (' . number_format($prevBal, 2, ',', ' ') . ' €)'];

                    foreach ($modules as $mod) {
                        $op = $mod['operator'] ?? '+';
                        $res = $resolveSourceValue($year, $m, $mod);
                        $val = $res['value'];
                        $lbl = $res['label'];
                        $itemOps = $res['operations'];
                        if (!empty($itemOps)) {
                            $allOps = array_merge($allOps, $itemOps);
                        }

                        if ($op === '-') {
                            $running -= $val;
                            $formulaParts[] = '- ' . $lbl . ' (' . number_format($val, 2, ',', ' ') . ' €)';
                        } else {
                            $running += $val;
                            $formulaParts[] = '+ ' . $lbl . ' (' . number_format($val, 2, ',', ' ') . ' €)';
                        }

                        $breakdown[] = [
                            'operator' => $op,
                            'source_type' => $mod['source_type'] ?? 'synthesis_row',
                            'source_label' => $lbl,
                            'value' => $val,
                        ];
                    }

                    $monthlyBalances[$m] = round($running, 2);
                    $monthlyAudits[$m] = [
                        'is_future' => false,
                        'calc_type' => 'cumulative_encours',
                        'label' => $rule->label,
                        'month' => $m,
                        'previous_balance' => round($prevBal, 2),
                        'breakdown_items' => $breakdown,
                        'final_balance' => round($running, 2),
                        'formula_text' => implode(' ', $formulaParts),
                        'operations' => $allOps,
                        'operations_sum' => round(array_sum(array_column($allOps, 'amount')), 2),
                    ];
                }
            }

            $calculatedRows[$rowId] = [
                'rule' => $rule,
                'initial_balance' => round($initialBalance, 2),
                'has_manual_initial' => $hasManualInitial,
                'has_prev_december' => $decPrevYearBalance !== null,
                'balances' => $monthlyBalances,
                'audits' => $monthlyAudits,
            ];
        };

        // Pass 1: Compute non-cumulative section rows (charges_fixes, charges_variables, revenus)
        foreach ($rules as $rule) {
            if ($rule->row_id === 'reste_a_vivre' || $rule->section === 'indicateurs') continue;
            $config = $rule->calculation_config ?? $this->convertLegacyRuleToConfig($rule);
            $carry = $config['carry_previous_month'] ?? false;
            if ($carry) continue;

            $computeNonCumulativeRow($rule);
        }

        // Pass 2: Compute non-cumulative reste_a_vivre (so cumulative encours can use it if desired)
        $resteRule = $ruleMap['reste_a_vivre'] ?? null;
        if ($resteRule) {
            $rConfig = $resteRule->calculation_config ?? $this->convertLegacyRuleToConfig($resteRule);
            if (!($rConfig['carry_previous_month'] ?? false)) {
                $computeNonCumulativeRow($resteRule);
            }
        }

        // Pass 3: Compute cumulative rows (encours_provisions and cumulative reste_a_vivre)
        foreach ($rules as $rule) {
            $config = $rule->calculation_config ?? $this->convertLegacyRuleToConfig($rule);
            $carry = $config['carry_previous_month'] ?? false;
            if (!$carry) continue;

            $computeCumulativeRow($rule);
        }

        // 5. Final Section Totals
        // Encours total : sum of encours_provisions section
        foreach ($rules as $rule) {
            if ($rule->section !== 'encours_provisions') continue;
            $rowId = $rule->row_id;
            if (isset($calculatedRows[$rowId])) {
                foreach ($calculatedRows[$rowId]['balances'] as $m => $bal) {
                    if ($bal !== null) {
                        if ($totalsBySection['encours_provisions'][$m] === null) {
                            $totalsBySection['encours_provisions'][$m] = 0.0;
                        }
                        $totalsBySection['encours_provisions'][$m] += $bal;
                    }
                }
            }
        }

        // Other sections (charges_fixes, charges_variables, revenus)
        foreach ($rules as $rule) {
            $sec = $rule->section;
            if ($sec === 'encours_provisions' || $sec === 'indicateurs' || $rule->row_id === 'reste_a_vivre') continue;

            if (!isset($totalsBySection[$sec])) {
                $totalsBySection[$sec] = array_fill(1, 12, null);
            }

            $rowId = $rule->row_id;
            if (isset($calculatedRows[$rowId])) {
                foreach ($calculatedRows[$rowId]['balances'] as $m => $bal) {
                    if ($bal !== null) {
                        if (($totalsBySection[$sec][$m] ?? null) === null) {
                            $totalsBySection[$sec][$m] = 0.0;
                        }
                        $totalsBySection[$sec][$m] += $bal;
                    }
                }
            }
        }

        // Round all totals
        foreach ($totalsBySection as $sec => $monthsArr) {
            $totalsBySection[$sec] = array_map(fn($v) => $v !== null ? round($v, 2) : null, $monthsArr);
        }

        return [
            'rules' => $rules,
            'calculatedRows' => $calculatedRows,
            'totalsBySection' => $totalsBySection,
            'manualValues' => $manualValues[$year] ?? [],
            'expenseTypes' => $expenseTypes,
        ];
    }
}
