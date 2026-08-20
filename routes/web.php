<?php

use App\Http\Controllers\ExpenseTypeController;
use App\Http\Controllers\OperationController;
use Illuminate\Support\Facades\Route;

// Operations (Main Page)
Route::get('/', [OperationController::class, 'index'])->name('operations.index');
Route::post('/operations/import', [OperationController::class, 'import'])->name('operations.import');
Route::patch('/operations/{operation}', [OperationController::class, 'update'])->name('operations.update');
Route::delete('/operations/{operation}', [OperationController::class, 'destroy'])->name('operations.destroy');
Route::post('/operations/bulk-delete', [OperationController::class, 'bulkDestroy'])->name('operations.bulk-destroy');

// Expense Types (Admin Page)
Route::get('/expense-types', [ExpenseTypeController::class, 'index'])->name('expense-types.index');
Route::post('/expense-types', [ExpenseTypeController::class, 'store'])->name('expense-types.store');
Route::patch('/expense-types/{expenseType}', [ExpenseTypeController::class, 'update'])->name('expense-types.update');
Route::delete('/expense-types/{expenseType}', [ExpenseTypeController::class, 'destroy'])->name('expense-types.destroy');
