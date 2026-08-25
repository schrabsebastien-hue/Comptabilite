import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { 
    X, 
    Settings, 
    Check, 
    Plus, 
    Trash2, 
    Calculator, 
    Layers, 
    Sparkles, 
    Search, 
    ChevronDown, 
    Wallet, 
    ArrowDownRight 
} from 'lucide-react';

// Composant de sélection avec recherche intégrée et fermeture au clic extérieur
function SearchableSelect({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Rechercher..." 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const selectedOption = options.find(opt => String(opt.id) === String(value));

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.category && opt.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Group options by category
    const categories = [];
    const grouped = {};
    filteredOptions.forEach(opt => {
        const cat = opt.category || 'Autres';
        if (!grouped[cat]) {
            grouped[cat] = [];
            categories.push(cat);
        }
        grouped[cat].push(opt);
    });

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Bouton d'affichage du sélecteur */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearchTerm('');
                }}
                className="w-full bg-surface-raised border border-edge-strong hover:border-edge-strong rounded-lg px-2.5 py-1.5 text-xs text-left text-white flex items-center justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-inner"
            >
                <span className="truncate font-medium text-on-surface">
                    {selectedOption ? selectedOption.label : 'Sélectionner une option...'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-on-surface-muted shrink-0 ml-1.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>

            {/* Menu déroulant avec champ de recherche */}
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-surface-raised border border-edge-strong rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col">
                    {/* Champ de recherche */}
                    <div className="p-2 border-b border-edge bg-surface/90 sticky top-0 z-10 flex items-center space-x-2">
                        <Search className="w-3.5 h-3.5 text-on-surface-muted shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-transparent text-xs text-white placeholder-on-surface-faint focus:outline-none"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-on-surface-faint hover:text-on-surface-secondary p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Liste des options filtrées */}
                    <div className="overflow-y-auto p-1 text-xs divide-y divide-edge/40">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-on-surface-faint text-xs">
                                Aucun résultat pour « {searchTerm} »
                            </div>
                        ) : (
                            categories.map(cat => (
                                <div key={cat} className="py-1">
                                    <div className="px-2.5 py-0.5 text-[9px] font-bold text-on-surface-muted uppercase tracking-wider bg-surface/40 rounded">
                                        {cat}
                                    </div>
                                    <div className="mt-0.5 space-y-0.5">
                                        {grouped[cat].map(opt => {
                                            const isSelected = String(opt.id) === String(value);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onChange(opt.id);
                                                        setIsOpen(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                                                        isSelected 
                                                            ? 'bg-indigo-600/30 text-accent-light font-semibold border border-accent-border' 
                                                            : 'text-on-surface-secondary hover:bg-surface-elevated hover:text-white'
                                                    }`}
                                                >
                                                    <span className="truncate">{opt.label}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-1.5" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RowRuleModal({ 
    rowRule, 
    availableRules = [], 
    expenseTypes = [], 
    onClose 
}) {
    if (!rowRule) return null;

    const [label, setLabel] = useState(rowRule.label || '');
    const [carryPreviousMonth, setCarryPreviousMonth] = useState(
        rowRule.calculation_config?.carry_previous_month ?? (rowRule.calculation_type === 'cumulative_encours')
    );
    const [modules, setModules] = useState(
        rowRule.calculation_config?.modules || []
    );
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLabel(rowRule.label || '');
        setCarryPreviousMonth(
            rowRule.calculation_config?.carry_previous_month ?? (rowRule.calculation_type === 'cumulative_encours')
        );
        setModules(rowRule.calculation_config?.modules || []);
    }, [rowRule]);

    // Available synthesis rows formatted cleanly
    const otherRules = availableRules.filter(r => r.row_id !== rowRule.row_id && r.row_id !== 'reste_a_vivre');

    const sectionTotalOptions = [
        { id: 'total_revenus', label: 'Total des revenus', category: 'Totaux de sections' },
        { id: 'total_charges_mois', label: 'Total des charges du mois', category: 'Totaux de sections' },
        { id: 'total_charges_fixes', label: 'Total des charges fixes', category: 'Totaux de sections' },
        { id: 'total_charges_variables', label: 'Total des charges variables', category: 'Totaux de sections' },
        { id: 'total_encours_provisions', label: 'Total Encours et provisions', category: 'Totaux de sections' },
    ];
    if (rowRule.row_id !== 'reste_a_vivre') {
        sectionTotalOptions.push({ id: 'reste_a_vivre', label: 'Reste à vivre', category: 'Totaux de sections' });
    }

    const synthesisRowOptions = [
        // Totaux de sections
        ...sectionTotalOptions,
        
        // Provisions
        ...otherRules.filter(r => r.is_provision).map(r => ({
            id: r.row_id,
            label: r.label,
            category: 'Provisions'
        })),

        // Charges fixes
        ...otherRules.filter(r => r.section === 'charges_fixes' && !r.is_provision).map(r => ({
            id: r.row_id,
            label: r.label,
            category: 'Charges fixes'
        })),

        // Charges variables
        ...otherRules.filter(r => r.section === 'charges_variables').map(r => ({
            id: r.row_id,
            label: r.label,
            category: 'Charges variables'
        })),

        // Revenus
        ...otherRules.filter(r => r.section === 'revenus').map(r => ({
            id: r.row_id,
            label: r.label,
            category: 'Revenus'
        })),

        // Encours et provisions
        ...otherRules.filter(r => r.section === 'encours_provisions').map(r => ({
            id: r.row_id,
            label: r.label,
            category: 'Encours'
        }))
    ];

    // Expense types formatted cleanly
    const expenseTypeOptions = expenseTypes.map(t => ({
        id: t.id,
        label: t.name,
        category: 'Types de dépenses'
    }));

    const addModule = (type = 'synthesis_row') => {
        const defaultSourceId = type === 'expense_type' 
            ? (expenseTypes[0]?.id || '') 
            : (synthesisRowOptions[0]?.id || 'total_revenus');

        const newMod = {
            id: 'mod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            operator: '+',
            source_type: type,
            source_id: defaultSourceId,
        };
        setModules(prev => [...prev, newMod]);
    };

    const updateModule = (index, field, value) => {
        setModules(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            
            if (field === 'source_type') {
                copy[index].source_id = value === 'expense_type' 
                    ? (expenseTypes[0]?.id || '') 
                    : (synthesisRowOptions[0]?.id || 'total_revenus');
            }
            return copy;
        });
    };

    const removeModule = (index) => {
        setModules(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);

        const config = {
            carry_previous_month: Boolean(carryPreviousMonth),
            modules: modules.map(m => ({
                id: m.id || ('mod_' + Math.random().toString(36).substr(2, 6)),
                operator: m.operator === '-' ? '-' : '+',
                source_type: m.source_type,
                source_id: m.source_type === 'expense_type' ? parseInt(m.source_id, 10) : m.source_id,
            })),
        };

        router.post('/synthese/rules', {
            row_id: rowRule.row_id,
            label: label,
            calculation_config: config,
        }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setIsSaving(false);
                onClose();
            }
        });
    };

    // Helper to get source label for formula preview
    const getSourceLabel = (mod) => {
        if (mod.source_type === 'expense_type') {
            const exp = expenseTypes.find(t => t.id === parseInt(mod.source_id, 10));
            return exp ? exp.name : `Dépense #${mod.source_id}`;
        }
        if (mod.source_id === 'total_revenus') return 'Total des revenus';
        if (mod.source_id === 'total_charges_mois') return 'Total des charges du mois';
        if (mod.source_id === 'total_charges_fixes') return 'Total des charges fixes';
        if (mod.source_id === 'total_charges_variables') return 'Total des charges variables';
        if (mod.source_id === 'total_encours_provisions') return 'Total Encours et provisions';
        if (mod.source_id === 'reste_a_vivre') return 'Reste à vivre';
        const r = availableRules.find(item => item.row_id === mod.source_id);
        return r ? r.label : mod.source_id;
    };

    return (
        <div className="bg-surface-raised border border-edge rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[640px] max-h-[calc(100vh-60px)] animate-in fade-in slide-in-from-left duration-300 backdrop-blur-md">
            {/* En-tête du volet intégré */}
            <div className="bg-surface/90 px-5 py-4 border-b border-edge flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-md shadow-indigo-500/20">
                        <div className="w-full h-full bg-surface rounded-[6px] flex items-center justify-center">
                            <Calculator className="w-4 h-4 text-cyan-400" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm truncate max-w-[280px]" title={rowRule.label}>
                            {rowRule.label}
                        </h3>
                        <p className="text-[11px] text-on-surface-muted">
                            Configurateur de calcul
                        </p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-on-surface-muted hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                    title="Fermer le volet"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Formulaire défilable avec padding bas confortable */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs pb-24">
                    
                    {/* 1. Libellé affiché */}
                    <div>
                        <label className="block text-[11px] font-semibold text-on-surface-secondary uppercase tracking-wider mb-1">
                            Libellé affiché
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full bg-surface border border-edge-strong rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            required
                        />
                    </div>

                    {/* 2. Option : Report du mois précédent (M-1) */}
                    <div className="bg-surface/60 border border-edge rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                        <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-on-surface text-xs">
                                    Report du mois précédent (M-1)
                                </span>
                                {carryPreviousMonth && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                                        Cumul
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-on-surface-muted leading-tight">
                                Reprend le solde précédent. Solde au 1er janvier géré via <strong>N-1</strong>.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setCarryPreviousMonth(!carryPreviousMonth)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                carryPreviousMonth ? 'bg-cyan-600' : 'bg-surface-elevated'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    carryPreviousMonth ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* 3. Constructeur de briques */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-semibold text-on-surface-secondary uppercase tracking-wider flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-accent" />
                                Briques de calcul ({modules.length})
                            </label>
                            
                            <div className="flex items-center space-x-1.5">
                                <button
                                    type="button"
                                    onClick={() => addModule('synthesis_row')}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-accent-light border border-accent-border text-[10px] font-medium transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>Ligne</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => addModule('expense_type')}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>Dépense</span>
                                </button>
                            </div>
                        </div>

                        {modules.length === 0 ? (
                            <div className="bg-surface/40 border border-dashed border-edge rounded-xl p-4 text-center text-on-surface-faint space-y-0.5">
                                <p className="font-medium text-on-surface-muted text-xs">Aucune brique configurée.</p>
                                <p className="text-[10px]">
                                    {carryPreviousMonth 
                                        ? 'Le solde restera constant d’un mois sur l’autre.' 
                                        : 'Saisie manuelle directe dans le tableau.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {modules.map((mod, idx) => (
                                    <div 
                                        key={mod.id || idx}
                                        className="bg-surface/80 border border-edge rounded-xl p-2.5 space-y-2 shadow-inner"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            {/* Sélecteur d'opérateur (+ / -) */}
                                            <div className="flex items-center space-x-0.5 bg-surface-raised border border-edge rounded-md p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => updateModule(idx, 'operator', '+')}
                                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                                        mod.operator === '+' 
                                                            ? 'bg-emerald-600 text-white shadow-sm' 
                                                            : 'text-on-surface-muted hover:text-white'
                                                    }`}
                                                >
                                                    + Ajouter
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateModule(idx, 'operator', '-')}
                                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                                        mod.operator === '-' 
                                                            ? 'bg-rose-600 text-white shadow-sm' 
                                                            : 'text-on-surface-muted hover:text-white'
                                                    }`}
                                                >
                                                    - Retirer
                                                </button>
                                            </div>

                                            {/* Type de source */}
                                            <select
                                                value={mod.source_type}
                                                onChange={(e) => updateModule(idx, 'source_type', e.target.value)}
                                                className="bg-surface-raised border border-edge-strong rounded-md px-2 py-1 text-[11px] text-on-surface focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            >
                                                <option value="synthesis_row">Ligne du tableau</option>
                                                <option value="expense_type">Type de dépense</option>
                                            </select>

                                            {/* Bouton supprimer */}
                                            <button
                                                type="button"
                                                onClick={() => removeModule(idx)}
                                                className="p-1 rounded text-on-surface-faint hover:text-negative hover:bg-surface-raised transition-colors cursor-pointer shrink-0 ml-auto"
                                                title="Supprimer cette brique"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Sélecteur de source avec recherche */}
                                        <div>
                                            {mod.source_type === 'expense_type' ? (
                                                <SearchableSelect
                                                    value={mod.source_id}
                                                    onChange={(newId) => updateModule(idx, 'source_id', newId)}
                                                    options={expenseTypeOptions}
                                                    placeholder="Rechercher une dépense..."
                                                />
                                            ) : (
                                                <SearchableSelect
                                                    value={mod.source_id}
                                                    onChange={(newId) => updateModule(idx, 'source_id', newId)}
                                                    options={synthesisRowOptions}
                                                    placeholder="Rechercher une ligne..."
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. Aperçu formule */}
                    <div className="bg-surface/80 border border-edge rounded-xl p-3 space-y-1 shadow-inner">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Formule résultante
                        </span>
                        <div className="font-mono text-cyan-300 text-[11px] bg-surface-raised/80 p-2 rounded border border-edge/80 break-words leading-relaxed">
                            {carryPreviousMonth ? '[Solde M-1]' : ''}
                            {modules.length === 0 && !carryPreviousMonth && 'Saisie manuelle directe'}
                            {modules.map((m, i) => (
                                <span key={i} className="inline">
                                    {' '}{m.operator === '-' ? '-' : '+'} [{getSourceLabel(m)}]
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pied de page du volet */}
                <div className="bg-surface/90 px-4 py-3 border-t border-edge flex items-center justify-end space-x-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg bg-surface-elevated text-on-surface-secondary hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-cyan-600 to-cyan-500 hover:brightness-110 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                    >
                        {isSaving ? (
                            <span>Enregistrement...</span>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Enregistrer</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
