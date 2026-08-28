import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmDeleteRowModal({ rule, onClose }) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!rule) return null;

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(`/synthese/row/${rule.row_id}`, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onFinish: () => {
                setIsDeleting(false);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-raised border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                
                {/* En-tête de la modale d'avertissement */}
                <div className="flex items-start justify-between border-b border-edge pb-3">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-negative border border-rose-500/20 shrink-0">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-on-surface text-base">
                                Demande de confirmation
                            </h3>
                            <p className="text-xs text-negative font-medium">
                                Action irréversible
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Message d'avertissement explicite */}
                <div className="space-y-3">
                    <p className="text-xs text-on-surface leading-relaxed">
                        Êtes-vous absolument sûr de vouloir supprimer la ligne <strong className="text-on-surface px-1.5 py-0.5 rounded bg-surface border border-edge">{rule.label}</strong> ?
                    </p>
                    
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 rounded-xl space-y-1.5">
                        <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 uppercase tracking-wide">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-negative" />
                            Avertissement important
                        </p>
                        <p className="text-xs text-rose-700 dark:text-rose-200/90 leading-relaxed">
                            La suppression de cette ligne effacera définitivement sa règle de calcul ainsi que <strong>toutes les valeurs saisies manuellement</strong> pour cette enveloppe sur l'ensemble des années enregistrées.
                        </p>
                    </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-edge">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-xl bg-surface-elevated text-on-surface-secondary hover:text-on-surface text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
