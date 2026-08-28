import React from 'react';
import { 
    X, 
    Calculator, 
    Layers, 
    Receipt, 
    ArrowRight, 
    Settings, 
    Calendar,
    Coins,
    HelpCircle,
    MinusCircle,
    PlusCircle
} from 'lucide-react';

export default function CellAuditModal({ 
    audit, 
    rowRule, 
    year, 
    monthName, 
    onClose, 
    onOpenRuleSettings 
}) {
    if (!audit) return null;

    const formatAmount = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return new Intl.DateTimeFormat('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(d);
        } catch {
            return dateStr;
        }
    };

    const getCalcTypeBadge = () => {
        if (audit.calc_type === 'cumulative_encours') {
            return {
                label: 'Cumulatif (Report M-1 + Modules)',
                badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
            };
        }
        if (audit.calc_type === 'modular_monthly') {
            return {
                label: 'Formule modulaire mensuelle',
                badgeClass: 'bg-indigo-500/10 text-accent-light border-accent-border'
            };
        }
        return {
            label: 'Saisie manuelle',
            badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        };
    };

    const badge = getCalcTypeBadge();
    const ops = audit.operations || [];
    const breakdownItems = audit.breakdown_items || [];

    return (
        <div className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-surface-raised border border-edge rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                
                {/* En-tête du modal */}
                <div className="bg-surface/80 px-6 py-4 border-b border-edge flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <div className="w-full h-full bg-surface rounded-[10px] flex items-center justify-center">
                                <Calculator className="w-5 h-5 text-cyan-400" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-on-surface text-base">
                                    {audit.label || rowRule?.label}
                                </h3>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-on-surface-secondary border border-edge-strong font-medium">
                                    {monthName} {year}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${badge.badgeClass}`}>
                                    {badge.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Corps de l'audit */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                    
                    {/* Bloc Formule explicative */}
                    <div className="bg-surface/60 border border-edge rounded-xl p-4 space-y-2 shadow-inner">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                            Formule appliquée
                        </span>
                        <div className="font-mono text-cyan-200 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-500/20 text-xs break-words">
                            {audit.formula_text}
                        </div>
                    </div>

                    {/* Bloc Décomposition des briques / modules */}
                    {(audit.calc_type === 'cumulative_encours' || audit.calc_type === 'modular_monthly') && (
                        <div className="space-y-3">
                            <span className="text-xs font-semibold text-on-surface-secondary flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-cyan-400" />
                                Décomposition du calcul
                            </span>

                            <div className="space-y-2 bg-surface/40 border border-edge rounded-xl p-3">
                                {/* Solde M-1 si cumulatif */}
                                {audit.previous_balance !== undefined && (
                                    <div className="flex items-center justify-between py-1.5 border-b border-edge/80">
                                        <div className="flex items-center space-x-2">
                                            <span className="px-1.5 py-0.5 rounded bg-surface-elevated text-on-surface-secondary text-[10px] font-mono font-bold">
                                                START
                                            </span>
                                            <span className="text-on-surface-secondary font-medium">Solde du mois précédent (M-1)</span>
                                        </div>
                                        <span className="font-mono font-semibold text-on-surface">
                                            {formatAmount(audit.previous_balance)}
                                        </span>
                                    </div>
                                )}

                                {/* Liste des briques calculées */}
                                {breakdownItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-edge/50 last:border-b-0">
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                item.operator === '-' 
                                                    ? 'bg-rose-950 text-negative-light border border-rose-800' 
                                                    : 'bg-emerald-950 text-positive-light border border-emerald-800'
                                            }`}>
                                                {item.operator} {item.operator === '-' ? 'RETIRER' : 'AJOUTER'}
                                            </span>
                                            <span className="text-on-surface-secondary font-medium">
                                                {item.source_label}
                                            </span>
                                        </div>
                                        <span className={`font-mono font-semibold ${item.operator === '-' ? 'text-negative' : 'text-positive'}`}>
                                            {item.operator === '-' ? '-' : '+'}{formatAmount(item.value)}
                                        </span>
                                    </div>
                                ))}

                                {/* Résultat final */}
                                <div className="flex items-center justify-between pt-2 border-t border-accent-border text-sm font-bold bg-indigo-950/20 -mx-3 -mb-3 p-3 rounded-b-xl">
                                    <span className="text-accent-light uppercase tracking-wide text-xs">= Solde final calculé</span>
                                    <span className="font-mono text-accent-light">
                                        {formatAmount(audit.final_balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bloc Liste des opérations réelles rattachées */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-on-surface-secondary flex items-center gap-1.5">
                                <Receipt className="w-4 h-4 text-accent" />
                                Écritures bancaires réelles associées ({ops.length})
                            </span>
                            {ops.length > 0 && (
                                <span className="text-[11px] font-mono font-semibold text-on-surface-secondary">
                                    Total : {formatAmount(audit.operations_sum)}
                                </span>
                            )}
                        </div>

                        {ops.length === 0 ? (
                            <div className="bg-surface/40 border border-dashed border-edge rounded-xl p-5 text-center text-on-surface-faint">
                                <p>Aucune écriture bancaire individuelle n'est rattachée directement pour ce mois.</p>
                            </div>
                        ) : (
                            <div className="border border-edge rounded-xl overflow-hidden shadow-inner">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-surface text-on-surface-muted uppercase tracking-wider border-b border-edge">
                                        <tr>
                                            <th className="px-3 py-2 text-[10px]">Date</th>
                                            <th className="px-3 py-2 text-[10px]">Libellé</th>
                                            <th className="px-3 py-2 text-[10px]">Catégorie</th>
                                            <th className="px-3 py-2 text-[10px] text-right">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-edge/60 bg-surface-raised/40">
                                        {ops.map((op) => (
                                            <tr key={op.id} className="hover:bg-surface-elevated/40 transition-colors">
                                                <td className="px-3 py-2 text-on-surface-muted whitespace-nowrap font-mono text-[11px]">
                                                    {formatDate(op.date)}
                                                </td>
                                                <td className="px-3 py-2 text-on-surface font-medium max-w-[200px] truncate" title={op.label}>
                                                    {op.label}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-on-surface-secondary text-[10px] border border-edge-strong/60 whitespace-nowrap">
                                                        {op.expense_type_name}
                                                    </span>
                                                </td>
                                                <td className={`px-3 py-2 text-right font-mono font-semibold whitespace-nowrap ${op.amount < 0 ? 'text-negative' : 'text-positive'}`}>
                                                    {formatAmount(op.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pied de page du modal */}
                <div className="bg-surface/80 px-6 py-3.5 border-t border-edge flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            if (onOpenRuleSettings && rowRule) {
                                onOpenRuleSettings(rowRule);
                            }
                        }}
                        className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface-overlay text-on-surface hover:text-on-surface text-xs font-medium transition-colors cursor-pointer border border-edge-strong"
                    >
                        <Settings className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Modifier la formule de cette ligne</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
