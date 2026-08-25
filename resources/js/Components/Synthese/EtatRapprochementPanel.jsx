import React, { useState, useEffect } from 'react';
import { 
    Scale, 
    X, 
    CheckCircle2, 
    AlertTriangle, 
    RotateCcw, 
    Calendar,
    ChevronDown,
    ShieldCheck
} from 'lucide-react';

const DEFAULT_ROWS = [
    { id: 'livret_a_pauline', label: 'Livret A Pauline' },
    { id: 'livret_a_sebastien', label: 'Livret A Sébastien' },
    { id: 'ldd_pauline', label: 'LDD Pauline' },
    { id: 'ldd_sebastien', label: 'LDD Sébastien' },
    { id: 'compte_courant', label: 'Compte courant' },
];

const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Helper de formatage pour les champs de saisie (avec séparateur de milliers = espace et virgule décimale)
const formatInputValue = (val, forceDecimals = false) => {
    if (val === undefined || val === null || val === '') return '';
    let str = String(val).trim();
    if (!str) return '';

    str = str.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
    const isNeg = str.startsWith('-');
    if (isNeg) str = str.substring(1);

    const parts = str.split('.');
    let integerPart = parts[0].replace(/\D/g, '');
    let decimalPart = parts.length > 1 ? parts[1].replace(/\D/g, '') : null;

    if (!integerPart && decimalPart === null) return '';
    if (!integerPart) integerPart = '0';

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    if (forceDecimals) {
        const dec = (decimalPart !== null ? decimalPart : '').padEnd(2, '0').slice(0, 2);
        return (isNeg ? '-' : '') + formattedInteger + ',' + dec;
    }

    let result = (isNeg ? '-' : '') + formattedInteger;
    if (decimalPart !== null) {
        result += ',' + decimalPart.slice(0, 2);
    }
    return result;
};

// Helper pour formater tout le dictionnaire de valeurs
const formatValuesObject = (obj, forceDecimals = false) => {
    const formatted = {};
    DEFAULT_ROWS.forEach(row => {
        const raw = obj?.[row.id] ?? '';
        formatted[row.id] = raw !== '' ? formatInputValue(raw, forceDecimals) : '';
    });
    return formatted;
};

export default function EtatRapprochementPanel({
    selectedYear,
    systemCurrentYear,
    systemCurrentMonth,
    totalsBySection = {},
    onClose
}) {
    // Par défaut, sélectionner le mois en cours si on est sur l'année courante, sinon Décembre (12) ou dernier mois
    const defaultMonth = selectedYear === systemCurrentYear ? systemCurrentMonth : 12;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

    // Initialisation des valeurs (localStorage ou objet vide)
    const storageKey = `etat_rapprochement_${selectedYear}_m${selectedMonth}`;
    
    const [values, setValues] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? formatValuesObject(JSON.parse(saved), true) : {
                livret_a_pauline: '',
                livret_a_sebastien: '',
                ldd_pauline: '',
                ldd_sebastien: '',
                compte_courant: '',
            };
        } catch (e) {
            return {
                livret_a_pauline: '',
                livret_a_sebastien: '',
                ldd_pauline: '',
                ldd_sebastien: '',
                compte_courant: '',
            };
        }
    });

    // Recharger les données si l'année ou le mois change
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`etat_rapprochement_${selectedYear}_m${selectedMonth}`);
            if (saved) {
                setValues(formatValuesObject(JSON.parse(saved), true));
            } else {
                setValues({
                    livret_a_pauline: '',
                    livret_a_sebastien: '',
                    ldd_pauline: '',
                    ldd_sebastien: '',
                    compte_courant: '',
                });
            }
        } catch (e) {
            // ignore
        }
    }, [selectedYear, selectedMonth]);

    const handleInputChange = (id, rawVal) => {
        const formattedVal = formatInputValue(rawVal, false);
        const updated = {
            ...values,
            [id]: formattedVal
        };
        setValues(updated);
        try {
            localStorage.setItem(`etat_rapprochement_${selectedYear}_m${selectedMonth}`, JSON.stringify(updated));
        } catch (e) {
            // ignore
        }
    };

    const handleInputBlur = (id) => {
        const currentVal = values[id];
        if (currentVal && currentVal.trim() !== '') {
            const perfected = formatInputValue(currentVal, true);
            const updated = {
                ...values,
                [id]: perfected
            };
            setValues(updated);
            try {
                localStorage.setItem(`etat_rapprochement_${selectedYear}_m${selectedMonth}`, JSON.stringify(updated));
            } catch (e) {
                // ignore
            }
        }
    };

    const handleReset = () => {
        if (confirm('Effacer les montants saisis pour ce mois ?')) {
            const cleared = {
                livret_a_pauline: '',
                livret_a_sebastien: '',
                ldd_pauline: '',
                ldd_sebastien: '',
                compte_courant: '',
            };
            setValues(cleared);
            try {
                localStorage.removeItem(`etat_rapprochement_${selectedYear}_m${selectedMonth}`);
            } catch (e) {
                // ignore
            }
        }
    };

    // Calcul de la somme des lignes
    const parseNumber = (val) => {
        if (!val || typeof val !== 'string') return 0;
        const cleaned = val.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const totalRapprochement = DEFAULT_ROWS.reduce((acc, row) => {
        return acc + parseNumber(values[row.id]);
    }, 0);

    // Récupérer le montant actuel "Encours et provisions" pour le mois sélectionné
    const totalEncoursMonth = totalsBySection['encours_provisions']?.[selectedMonth];
    const targetAmount = totalEncoursMonth !== undefined && totalEncoursMonth !== null ? Number(totalEncoursMonth) : null;

    // Comparaison (tolérance de 0.005 pour arrondis centimes)
    const isConforme = targetAmount !== null && Math.abs(totalRapprochement - targetAmount) < 0.01;
    const diff = targetAmount !== null ? totalRapprochement - targetAmount : null;

    // Helper formatage
    const formatAmount = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    return (
        <div className="bg-surface-raised border border-edge-strong/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Header du panneau */}
            <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-4 py-3.5 flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-black/20 text-teal-100">
                        <Scale className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base tracking-wide leading-tight">
                            Etat de rapprochement
                        </h3>
                        <span className="text-[11px] text-teal-100/80">
                            Contrôle et concordance des comptes
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleReset}
                        className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-black/20 transition-colors"
                        title="Réinitialiser les montants"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-black/20 transition-colors"
                        title="Fermer le volet"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Sélecteur de mois & Rappel du mois d'audit */}
            <div className="p-4 bg-surface/60 border-b border-edge flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs text-on-surface-secondary">
                    <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Mois de contrôle :</span>
                </div>
                <div className="relative">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-surface-raised border border-edge-strong text-on-surface text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer appearance-none"
                    >
                        {MONTH_NAMES.map((name, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                                {name} {selectedYear}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-on-surface-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            </div>

            {/* Tableau de saisie */}
            <div className="p-4 space-y-4">
                <div className="border border-teal-500/30 rounded-xl overflow-hidden shadow-inner bg-surface/40">
                    <table className="w-full text-xs">
                        {/* En-tête style de la capture */}
                        <thead>
                            <tr className="bg-teal-700/80 text-teal-100 font-bold border-b border-teal-600/50">
                                <th colSpan={2} className="px-3.5 py-2.5 text-center text-sm tracking-wide text-white">
                                    Etat de rapprochement
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-edge/80 font-medium">
                            {DEFAULT_ROWS.map((row, idx) => (
                                <tr 
                                    key={row.id} 
                                    className={`hover:bg-surface-elevated/40 transition-colors ${
                                        idx % 2 === 0 ? 'bg-surface-raised/40' : 'bg-surface-raised/10'
                                    }`}
                                >
                                    <td className="px-3.5 py-2 text-on-surface font-normal">
                                        {row.label}
                                    </td>
                                    <td className="px-3 py-1.5 text-right w-44">
                                        <input
                                            type="text"
                                            value={values[row.id] ?? ''}
                                            onChange={(e) => handleInputChange(row.id, e.target.value)}
                                            onBlur={() => handleInputBlur(row.id)}
                                            placeholder="0,00"
                                            className="w-full bg-surface/90 border border-edge-strong/80 focus:border-teal-400 rounded-lg px-2.5 py-1 text-xs text-right text-teal-200 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-teal-400/50 transition-all placeholder:text-on-surface-faint"
                                        />
                                    </td>
                                </tr>
                            ))}

                            {/* Ligne Total calculée automatiquement */}
                            <tr className="bg-teal-950/60 border-t-2 border-teal-500/40 text-on-surface font-bold">
                                <td className="px-3.5 py-2.5 text-on-surface text-sm">
                                    Total
                                </td>
                                <td className="px-3.5 py-2.5 text-right font-mono text-sm text-teal-300 font-extrabold tracking-tight">
                                    {formatAmount(totalRapprochement)} €
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Bloc de Statut : Conforme / Non conforme */}
                <div className="space-y-2">
                    {isConforme ? (
                        <div className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-surface font-bold text-center text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all transform animate-in zoom-in-95 duration-200">
                            <CheckCircle2 className="w-5 h-5 text-surface stroke-[2.5]" />
                            <span className="tracking-wide">Conforme</span>
                        </div>
                    ) : (
                        <div className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-center text-sm shadow-lg shadow-rose-600/25 flex items-center justify-center space-x-2 transition-all transform animate-in zoom-in-95 duration-200">
                            <AlertTriangle className="w-5 h-5 text-white stroke-[2.5]" />
                            <span className="tracking-wide">Non conforme</span>
                        </div>
                    )}

                    {/* Détails de comparaison avec le total "Encours et provisions" */}
                    <div className="bg-surface/60 border border-edge rounded-xl p-3 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between text-on-surface-muted">
                            <span>Total "Encours et provisions" ({MONTH_NAMES[selectedMonth - 1]}) :</span>
                            <span className="font-mono font-semibold text-cyan-300">
                                {targetAmount !== null ? `${formatAmount(targetAmount)} €` : 'Non calculé'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-on-surface-muted">
                            <span>Total saisi (Etat de rapprochement) :</span>
                            <span className="font-mono font-semibold text-teal-300">
                                {formatAmount(totalRapprochement)} €
                            </span>
                        </div>
                        {diff !== null && Math.abs(diff) >= 0.01 && (
                            <div className="flex items-center justify-between pt-1 border-t border-edge/80 font-medium text-negative">
                                <span>Écart constaté :</span>
                                <span className="font-mono font-bold">
                                    {diff > 0 ? `+${formatAmount(diff)} €` : `${formatAmount(diff)} €`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
