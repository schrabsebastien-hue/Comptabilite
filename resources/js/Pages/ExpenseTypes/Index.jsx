import React, { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import {
    Settings,
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    Tag,
    GripVertical,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    CheckCircle2
} from 'lucide-react';

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

export default function Index({ expenseTypes: initialExpenseTypes }) {
    const [items, setItems] = useState(initialExpenseTypes || []);
    const [editingId, setEditingId] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [isReordering, setIsReordering] = useState(false);

    // Keep local items in sync with props
    useEffect(() => {
        setItems(initialExpenseTypes || []);
    }, [initialExpenseTypes]);

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
            preserveScroll: true,
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
            preserveScroll: true,
            onSuccess: () => {
                setEditingId(null);
            },
        });
    };

    const handleDelete = (type) => {
        if (confirm(`Voulez-vous supprimer le type "${type.name}" ?`)) {
            router.delete(`/expense-types/${type.id}`, {
                preserveScroll: true,
            });
        }
    };

    // Reordering logic
    const saveNewOrder = (newItems) => {
        setItems(newItems);
        setIsReordering(true);
        const ids = newItems.map((item) => item.id);
        router.post(
            '/expense-types/reorder',
            { ids },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsReordering(false),
            }
        );
    };

    const moveItem = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= items.length) return;
        const newItems = [...items];
        const [moved] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, moved);
        saveNewOrder(newItems);
    };

    // Drag and drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newItems = [...items];
        const [moved] = newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, moved);

        setDraggedIndex(null);
        setDragOverIndex(null);
        saveNewOrder(newItems);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <AppLayout title="Types de dépenses (Admin)">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
                            <Settings className="w-6 h-6 text-accent" />
                            <span>Administration des Types de dépense</span>
                        </h1>
                        <p className="text-sm text-on-surface-muted mt-1">
                            Personnalisez et réorganisez l'ordre d'affichage des catégories pour la sélection des opérations bancaires.
                        </p>
                    </div>

                    {isReordering && (
                        <div className="flex items-center space-x-2 text-xs text-accent bg-indigo-500/10 border border-accent-border px-3 py-1.5 rounded-full animate-pulse self-start">
                            <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                            <span>Enregistrement de l'ordre...</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Form Card */}
                    <div className="bg-surface-raised/60 border border-edge rounded-2xl p-5 backdrop-blur-sm h-fit space-y-4 shadow-xl">
                        <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-accent" />
                            <span>Ajouter un type de dépense</span>
                        </h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-on-surface-secondary mb-1">Nom du type</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Assurances, Véhicule..."
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    className="w-full bg-surface/80 border border-edge rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-indigo-500 transition"
                                />
                                {createForm.errors.name && (
                                    <div className="text-negative text-xs mt-1">{createForm.errors.name}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-on-surface-secondary mb-2">Couleur du badge</label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => createForm.setData('color', c)}
                                            className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                                                createForm.data.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : 'hover:scale-110'
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
                    <div className="lg:col-span-2 bg-surface-raised/60 border border-edge rounded-2xl p-5 backdrop-blur-sm space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Tag className="w-4 h-4 text-accent" />
                                <h2 className="text-base font-semibold text-white">Ordre des types de dépenses</h2>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="text-xs text-on-surface-muted bg-surface-elevated/80 px-2.5 py-1 rounded-full border border-edge-strong/60 font-medium">
                                    {items.length} catégorie(s)
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-on-surface-muted italic">
                            💡 Glissez-déposez les lignes ou utilisez les flèches <span className="text-accent-light font-semibold">▲ / ▼</span> pour définir l'ordre d'affichage dans le menu déroulant des opérations.
                        </p>

                        {items.length === 0 ? (
                            <div className="py-12 text-center text-on-surface-muted text-sm">
                                Aucun type de dépense configuré.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {items.map((type, index) => {
                                    const isEditing = editingId === type.id;
                                    const isDragging = draggedIndex === index;
                                    const isOver = dragOverIndex === index;

                                    return (
                                        <div
                                            key={type.id}
                                            draggable={!isEditing}
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                            className={`bg-surface/70 border rounded-xl p-3 flex items-center justify-between gap-3 transition-all select-none ${
                                                isDragging
                                                    ? 'opacity-40 border-dashed border-indigo-500 scale-[0.99]'
                                                    : isOver
                                                    ? 'border-accent-border bg-accent-bg scale-[1.01] shadow-lg shadow-indigo-500/10'
                                                    : 'border-edge/90 hover:border-edge-strong'
                                            }`}
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
                                                        className="flex-1 bg-surface-raised border border-indigo-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
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
                                                            className="p-2 rounded-lg bg-emerald-500/20 text-positive hover:bg-emerald-500/30 transition cursor-pointer"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingId(null)}
                                                            className="p-2 rounded-lg bg-surface-elevated text-on-surface-muted hover:text-white transition cursor-pointer"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <div className="flex items-center space-x-3 min-w-0">
                                                        {/* Drag handle */}
                                                        <div
                                                            className="cursor-grab active:cursor-grabbing text-on-surface-faint hover:text-accent p-1 -ml-1 rounded transition"
                                                            title="Glisser pour réorganiser"
                                                        >
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>

                                                        {/* Position Index Badge */}
                                                        <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-raised border border-edge text-on-surface-muted text-xs font-mono font-medium shrink-0">
                                                            {index + 1}
                                                        </span>

                                                        {/* Up/Down buttons */}
                                                        <div className="flex flex-col space-y-0.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => moveItem(index, index - 1)}
                                                                disabled={index === 0}
                                                                className="p-0.5 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-on-surface-muted transition cursor-pointer disabled:cursor-not-allowed"
                                                                title="Monter d'une position"
                                                            >
                                                                <ChevronUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => moveItem(index, index + 1)}
                                                                disabled={index === items.length - 1}
                                                                className="p-0.5 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-on-surface-muted transition cursor-pointer disabled:cursor-not-allowed"
                                                                title="Descendre d'une position"
                                                            >
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Color Dot & Name */}
                                                        <div
                                                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/20"
                                                            style={{ backgroundColor: type.color || '#6366f1' }}
                                                        />
                                                        <div className="flex items-center space-x-2 truncate">
                                                            <span className="font-semibold text-on-surface text-sm truncate">
                                                                {type.name}
                                                            </span>
                                                            <span className="text-[11px] text-on-surface-muted bg-surface-raised/90 px-2 py-0.5 rounded-full border border-edge shrink-0">
                                                                {type.operations_count} op.
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center space-x-1 shrink-0">
                                                        <button
                                                            onClick={() => startEditing(type)}
                                                            className="p-2 rounded-lg text-on-surface-muted hover:text-accent hover:bg-indigo-500/10 transition cursor-pointer"
                                                            title="Modifier"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(type)}
                                                            className="p-2 rounded-lg text-on-surface-muted hover:text-negative hover:bg-negative/10 transition cursor-pointer"
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
