<?php

namespace App\Http\Controllers;

use App\Models\ExpenseType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseTypeController extends Controller
{
    public function index(): Response
    {
        $expenseTypes = ExpenseType::withCount('operations')
            ->orderBy('name')
            ->get();

        return Inertia::render('ExpenseTypes/Index', [
            'expenseTypes' => $expenseTypes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_types,name',
            'color' => 'nullable|string|max:20',
        ]);

        ExpenseType::create([
            'name' => $validated['name'],
            'color' => $validated['color'] ?? '#6366f1',
        ]);

        return redirect()->back()->with('success', 'Type de dépense ajouté avec succès.');
    }

    public function update(Request $request, ExpenseType $expenseType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_types,name,' . $expenseType->id,
            'color' => 'nullable|string|max:20',
        ]);

        $expenseType->update($validated);

        return redirect()->back()->with('success', 'Type de dépense mis à jour.');
    }

    public function destroy(ExpenseType $expenseType)
    {
        $expenseType->delete();

        return redirect()->back()->with('success', 'Type de dépense supprimé.');
    }
}
