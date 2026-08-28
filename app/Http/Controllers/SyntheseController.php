<?php

namespace App\Http\Controllers;

use App\Models\SynthesisManualValue;
use App\Models\SynthesisRowRule;
use App\Services\SynthesisCalculationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SyntheseController extends Controller
{
    protected SynthesisCalculationService $calcService;

    public function __construct(SynthesisCalculationService $calcService)
    {
        $this->calcService = $calcService;
    }

    /**
     * Display the synthesis page for a given year.
     */
    public function index(Request $request): Response
    {
        $year = (int) $request->input('year', date('Y'));
        $currentSystemYear = (int) date('Y');
        $currentSystemMonth = (int) date('n');

        $data = $this->calcService->computeSynthesis($year);

        return Inertia::render('Synthese/Index', [
            'currentYear' => $year,
            'systemCurrentYear' => $currentSystemYear,
            'systemCurrentMonth' => $currentSystemMonth,
            'rules' => $data['rules'],
            'calculatedRows' => $data['calculatedRows'],
            'totalsBySection' => $data['totalsBySection'],
            'manualValues' => $data['manualValues'],
            'expenseTypes' => $data['expenseTypes'],
        ]);
    }

    /**
     * Save or update a manual value (e.g. provision, initial balance, charge).
     */
    public function updateValue(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer',
            'row_id' => 'required|string|max:100',
            'month' => 'required|integer|min:0|max:12',
            'value' => 'nullable|numeric',
        ]);

        $rule = SynthesisRowRule::where('row_id', $validated['row_id'])->first();
        if ($rule) {
            $config = $rule->calculation_config ?? [];
            $isCarry = !empty($config['carry_previous_month']);
            $hasModules = !empty($config['modules']);
            $isCalculated = $isCarry || $hasModules;

            // Verrouillage strict : impossible de modifier manuellement les mois 1 à 12 d'une ligne calculée
            if ($isCalculated && $validated['month'] > 0) {
                return redirect()->back()->with('error', 'Cette cellule est calculée automatiquement et ne peut pas être modifiée manuellement.');
            }

            // Le mois 0 (solde initial N-1) n'est autorisé que pour les lignes à report
            if ($validated['month'] === 0 && !$isCarry) {
                return redirect()->back()->with('error', 'Le solde initial n\'est disponible que pour les lignes avec report.');
            }
        }

        if ($validated['value'] === null || $validated['value'] === '') {
            SynthesisManualValue::where('year', $validated['year'])
                ->where('row_id', $validated['row_id'])
                ->where('month', $validated['month'])
                ->delete();
        } else {
            SynthesisManualValue::updateOrCreate(
                [
                    'year' => $validated['year'],
                    'row_id' => $validated['row_id'],
                    'month' => $validated['month'],
                ],
                [
                    'value' => $validated['value'],
                ]
            );
        }

        return redirect()->back()->with('success', 'Valeur enregistrée.');
    }

    /**
     * Update calculation rule for a specific synthesis row.
     */
    public function updateRule(Request $request)
    {
        $validated = $request->validate([
            'row_id' => 'required|string|max:100|exists:synthesis_row_rules,row_id',
            'label' => 'required|string|max:255',
            'calculation_config' => 'required|array',
            'calculation_config.carry_previous_month' => 'required|boolean',
            'calculation_config.modules' => 'nullable|array',
            'calculation_type' => 'nullable|string',
        ]);

        $rule = SynthesisRowRule::where('row_id', $validated['row_id'])->firstOrFail();
        
        $config = $validated['calculation_config'];
        $calcType = $config['carry_previous_month'] 
            ? 'cumulative_encours' 
            : (!empty($config['modules']) ? 'monthly_operations_sum' : 'manual');

        $rule->update([
            'label' => $validated['label'],
            'calculation_type' => $calcType,
            'calculation_config' => $config,
        ]);

        // Si la ligne est désormais calculée, supprimer les anciennes valeurs manuelles mensuelles (mois 1-12)
        if ($calcType !== 'manual') {
            SynthesisManualValue::where('row_id', $validated['row_id'])
                ->where('month', '>', 0)
                ->delete();
        }

        return redirect()->back()->with('success', 'Règle de calcul modulaire enregistrée.');
    }

    /**
     * Reset all rules to default configuration.
     */
    public function resetRules()
    {
        $this->calcService->seedDefaultRules();

        return redirect()->back()->with('success', 'Règles réinitialisées aux valeurs par défaut.');
    }

    /**
     * Store a new synthesis row in a specified section.
     */
    public function storeRow(Request $request)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'section' => 'required|string|in:encours_provisions,charges_fixes,charges_variables,revenus',
        ]);

        $baseSlug = \Illuminate\Support\Str::slug($validated['label'], '_');
        if (empty($baseSlug)) {
            $baseSlug = 'row_' . time();
        }

        // Ensure row_id is unique
        $rowId = $baseSlug;
        $counter = 1;
        while (SynthesisRowRule::where('row_id', $rowId)->exists()) {
            $rowId = $baseSlug . '_' . $counter;
            $counter++;
        }

        // Determine position
        $maxPosition = SynthesisRowRule::where('section', $validated['section'])->max('position');
        $position = ($maxPosition !== null) ? $maxPosition + 1 : 1;

        SynthesisRowRule::create([
            'row_id' => $rowId,
            'label' => trim($validated['label']),
            'section' => $validated['section'],
            'calculation_type' => 'manual',
            'calculation_config' => [
                'carry_previous_month' => false,
                'modules' => [],
            ],
            'position' => $position,
        ]);

        return redirect()->back()->with('success', "Ligne '{$validated['label']}' ajoutée avec succès.");
    }

    /**
     * Destroy a synthesis row and clean up associated manual values.
     */
    public function destroyRow(string $rowId)
    {
        if ($rowId === 'reste_a_vivre') {
            return redirect()->back()->with('error', 'La ligne Reste à vivre ne peut pas être supprimée.');
        }

        $rule = SynthesisRowRule::where('row_id', $rowId)->firstOrFail();
        $label = $rule->label;

        // Delete associated manual values
        SynthesisManualValue::where('row_id', $rowId)->delete();

        // Clean up references to this row in calculation_config of other rules
        $allRules = SynthesisRowRule::whereNotNull('calculation_config')->get();
        foreach ($allRules as $otherRule) {
            $config = $otherRule->calculation_config;
            if (!empty($config['modules']) && is_array($config['modules'])) {
                $initialCount = count($config['modules']);
                $filteredModules = array_values(array_filter($config['modules'], function ($m) use ($rowId) {
                    return !($m['source_type'] === 'synthesis_row' && (string)($m['source_id'] ?? '') === (string)$rowId);
                }));

                if (count($filteredModules) !== $initialCount) {
                    $config['modules'] = $filteredModules;
                    $otherRule->calculation_config = $config;
                    $otherRule->save();
                }
            }
        }

        $rule->delete();

        return redirect()->back()->with('success', "Ligne '{$label}' supprimée avec succès.");
    }

    /**
     * Reorder synthesis row rules.
     */
    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'ordered_ids' => 'required|array',
            'ordered_ids.*' => 'string|exists:synthesis_row_rules,row_id',
        ]);

        foreach ($validated['ordered_ids'] as $index => $rowId) {
            SynthesisRowRule::where('row_id', $rowId)->update(['position' => $index + 1]);
        }

        return redirect()->back()->with('success', 'Ordre des lignes mis à jour.');
    }
}
