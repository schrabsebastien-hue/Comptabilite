<?php

use App\Http\Controllers\ChartController;
use App\Http\Controllers\ExpenseTypeController;
use App\Http\Controllers\OperationController;
use App\Http\Controllers\SyntheseController;
use Illuminate\Support\Facades\Route;

// Operations (Main Page)
Route::get('/', [OperationController::class, 'index'])->name('operations.index');
Route::get('/synthese', [SyntheseController::class, 'index'])->name('synthese.index');
Route::get('/graphiques', [ChartController::class, 'index'])->name('graphiques.index');
Route::post('/synthese/value', [SyntheseController::class, 'updateValue'])->name('synthese.update-value');
Route::post('/synthese/rules', [SyntheseController::class, 'updateRule'])->name('synthese.update-rule');
Route::post('/synthese/rules/reset', [SyntheseController::class, 'resetRules'])->name('synthese.reset-rules');
Route::post('/synthese/row', [SyntheseController::class, 'storeRow'])->name('synthese.store-row');
Route::post('/synthese/reorder', [SyntheseController::class, 'reorder'])->name('synthese.reorder');
Route::delete('/synthese/row/{row_id}', [SyntheseController::class, 'destroyRow'])->name('synthese.destroy-row');
Route::post('/operations', [OperationController::class, 'store'])->name('operations.store');
Route::post('/operations/import', [OperationController::class, 'import'])->name('operations.import');
Route::patch('/operations/{operation}', [OperationController::class, 'update'])->name('operations.update');
Route::post('/operations/{operation}/split', [OperationController::class, 'split'])->name('operations.split');
Route::delete('/operations/{operation}', [OperationController::class, 'destroy'])->name('operations.destroy');
Route::patch('/operations/{operation}/validate', [OperationController::class, 'validateSuggestion'])->name('operations.validate-suggestion');
Route::post('/operations/bulk-validate', [OperationController::class, 'bulkValidateSuggestions'])->name('operations.bulk-validate-suggestions');
Route::post('/operations/bulk-delete', [OperationController::class, 'bulkDestroy'])->name('operations.bulk-destroy');
Route::post('/operations/bulk-clear-comments', [OperationController::class, 'bulkClearComments'])->name('operations.bulk-clear-comments');

// Expense Types (Admin Page)
Route::get('/expense-types', [ExpenseTypeController::class, 'index'])->name('expense-types.index');
Route::post('/expense-types', [ExpenseTypeController::class, 'store'])->name('expense-types.store');
Route::post('/expense-types/reorder', [ExpenseTypeController::class, 'reorder'])->name('expense-types.reorder');
Route::patch('/expense-types/{expenseType}', [ExpenseTypeController::class, 'update'])->name('expense-types.update');
Route::delete('/expense-types/{expenseType}', [ExpenseTypeController::class, 'destroy'])->name('expense-types.destroy');
