import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import { Settings, Plus, Edit2, Trash2, Check, X, Tag, AlertCircle } from 'lucide-react';

const PRESET_COLORS = [
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#64748b', // Slate
    '#ef4444', // Red
    '#84cc16', // Lime
];

export default function Index({ expenseTypes }) {
    const [editingId, setEditingId] = useState(null);

    // Form for new expense type
    const createForm = useForm({
        name: '',
        color: '#6366f1',
    });

    // Form for editing expense type
    const editForm = useForm({
        name: '',
        color: '',
    });

    const handleCreate = (e) => {
        e.preventDefault();
        createForm.post('/expense-types', {
            onSuccess: () => {
                createForm.reset();
            },
        });
    };

    const startEditing = (type) => {
        setEditingId(type.id);
        editForm.setData({
            name: type.name,
            color: type.color || '#6366f1',
        });
    };

    const handleUpdate = (e, id) => {
        e.preventDefault();
        editForm.patch(`/expense-types/${id}`, {
            onSuccess: () => {
                setEditingId(null);
            },
        });
    };

    const handleDelete = (type) => {
        if (confirm(`Voulez-vous supprimer le type "${type.name}" ?`)) {
            router.delete(`/expense-types/${type.id}`);
        }
    };

    return (
        <AppLayout title="Types de dépenses (Admin)">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
                        <Settings className="w-6 h-6 text-indigo-400" />
                        <span>Administration des Types de dépense</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Gérez les catégories disponibles dans le menu déroulant lors de la qualification des opérations bancaires.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Form Card */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm h-fit space-y-4">
                        <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-indigo-400" />
                            <span>Ajouter un type de dépense</span>
                        </h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Nom du type</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Assurances, Véhicule..."
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                                />
                                {createForm.errors.name && (
                                    <div className="text-rose-400 text-xs mt-1">{createForm.errors.name}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-2">Couleur du badge</label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => createForm.setData('color', c)}
                                            className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                                                createForm.data.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'hover:scale-110'
                                            }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={createForm.data.color}
                                        onChange={(e) => createForm.setData('color', e.target.value)}
                                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                                        title="Choisir une couleur personnalisée"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={createForm.processing || !createForm.data.name.trim()}
                                className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Ajouter à la liste</span>
                            </button>
                        </form>
                    </div>

                    {/* Expense Types List */}
                    <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                                <Tag className="w-4 h-4 text-indigo-400" />
                                <span>Types de dépenses enregistrés</span>
                            </h2>
                            <span className="text-xs text-slate-400 font-medium">
                                {expenseTypes.length} catégorie(s)
                            </span>
                        </div>

                        {expenseTypes.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm">
                                Aucun type de dépense configuré.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {expenseTypes.map((type) => {
                                    const isEditing = editingId === type.id;

                                    return (
                                        <div
                                            key={type.id}
                                            className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between transition hover:border-slate-700"
                                        >
                                            {isEditing ? (
                                                <form
                                                    onSubmit={(e) => handleUpdate(e, type.id)}
                                                    className="flex-1 flex flex-col sm:flex-row items-center gap-3"
                                                >
                                                    <input
                                                        type="text"
                                                        value={editForm.data.name}
                                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                                        className="flex-1 bg-slate-900 border border-indigo-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                                                    />
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="color"
                                                            value={editForm.data.color}
                                                            onChange={(e) => editForm.setData('color', e.target.value)}
                                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={editForm.processing}
                                                            className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition cursor-pointer"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingId(null)}
                                                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                                                            style={{ backgroundColor: type.color || '#6366f1' }}
                                                        />
                                                        <div>
                                                            <span className="font-semibold text-slate-200 text-sm">
                                                                {type.name}
                                                            </span>
                                                            <span className="ml-3 text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                                                                {type.operations_count} opération(s)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            onClick={() => startEditing(type)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition cursor-pointer"
                                                            title="Modifier"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(type)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
