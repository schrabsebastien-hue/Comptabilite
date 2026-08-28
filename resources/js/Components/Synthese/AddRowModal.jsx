import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { X, Plus, Layers } from 'lucide-react';

export default function AddRowModal({ initialSection = 'charges_fixes', onClose }) {
    const [label, setLabel] = useState('');
    const [section, setSection] = useState(initialSection);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const sectionsOptions = [
        { id: 'encours_provisions', label: 'Encours et provisions' },
        { id: 'charges_fixes', label: 'Charges fixes' },
        { id: 'charges_variables', label: 'Charges variables' },
        { id: 'revenus', label: 'Revenus' },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!label.trim()) {
            setError('Veuillez saisir un nom pour la ligne.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        router.post('/synthese/row', {
            label: label.trim(),
            section: section,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onError: (errors) => {
                setError(errors.label || errors.section || 'Une erreur s\'est produite.');
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-raised border border-edge rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-edge pb-3">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-accent border border-accent-border">
                            <Plus className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-on-surface text-base">
                            Ajouter une nouvelle ligne
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-on-surface-muted uppercase tracking-wider mb-1.5">
                            Nom de la ligne
                        </label>
                        <input
                            type="text"
                            autoFocus
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="ex: Abonnements streaming, Impôts fonciers..."
                            className="w-full bg-surface border border-edge-strong rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-on-surface-muted uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-accent" />
                            <span>Zone de destination</span>
                        </label>
                        <select
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            className="w-full bg-surface border border-edge-strong rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                        >
                            {sectionsOptions.map((opt) => (
                                <option key={opt.id} value={opt.id} className="bg-surface text-on-surface">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-2 border-t border-edge">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-surface-elevated text-on-surface-secondary hover:text-on-surface text-xs font-medium transition-colors cursor-pointer"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{isSubmitting ? 'Ajout en cours...' : 'Ajouter la ligne'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
