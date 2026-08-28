import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import CellAuditModal from '../../Components/Synthese/CellAuditModal';
import RowRuleModal from '../../Components/Synthese/RowRuleModal';
import EtatRapprochementPanel from '../../Components/Synthese/EtatRapprochementPanel';
import AddRowModal from '../../Components/Synthese/AddRowModal';
import ConfirmDeleteRowModal from '../../Components/Synthese/ConfirmDeleteRowModal';
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    ChevronDown,
    ChevronUp,
    ChevronRight as ChevronRightIcon,
    TrendingUp, 
    ArrowDownRight, 
    ArrowUpRight, 
    Wallet, 
    CreditCard,
    Shield,
    ChevronsUpDown,
    ChevronsDownUp,
    Edit2,
    Check,
    X,
    HelpCircle,
    RotateCcw,
    Settings,
    Search,
    Info,
    Scale,
    Plus,
    Trash2,
    GripVertical
} from 'lucide-react';

export default function SyntheseIndex({ 
    currentYear = new Date().getFullYear(),
    systemCurrentYear = new Date().getFullYear(),
    systemCurrentMonth = new Date().getMonth() + 1,
    rules = [],
    calculatedRows = {},
    totalsBySection = {},
    manualValues = {},
    expenseTypes = []
}) {
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [collapsedSections, setCollapsedSections] = useState([]);
    
    // Cell currently being edited inline for manual values: { rowId, month }
    const [editingCell, setEditingCell] = useState(null);
    const [editInputValue, setEditInputValue] = useState('');
    const [savingCell, setSavingCell] = useState(null);

    // Initial balance modal for Encours (month 0)
    const [editingInitialBalanceRow, setEditingInitialBalanceRow] = useState(null);
    const [initialBalanceValue, setInitialBalanceValue] = useState('');

    // Active Cell Audit Modal: { rule, month, monthName, audit }
    const [selectedAudit, setSelectedAudit] = useState(null);

    // Active Row Rule Config Modal: rule object
    const [editingRule, setEditingRule] = useState(null);

    // Active Etat de Rapprochement panel
    const [showRapprochement, setShowRapprochement] = useState(false);

    // Add Row Modal: section id or null
    const [addingRowSection, setAddingRowSection] = useState(null);

    // Confirm Delete Row Modal: rule object or null
    const [rowToDelete, setRowToDelete] = useState(null);

    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Helper to check if a month is in the future
    const isFutureMonth = (monthNum) => {
        if (selectedYear > systemCurrentYear) return true;
        if (selectedYear < systemCurrentYear) return false;
        return monthNum > systemCurrentMonth;
    };

    // Helper to check if a month is the current month
    const isCurrentMonth = (monthNum) => {
        return selectedYear === systemCurrentYear && monthNum === systemCurrentMonth;
    };

    const changeYear = (newYear) => {
        setSelectedYear(newYear);
        router.get('/synthese', { year: newYear }, { preserveState: true, replace: true });
    };

    const toggleSection = (sectionId) => {
        setCollapsedSections(prev => 
            prev.includes(sectionId) 
                ? prev.filter(id => id !== sectionId) 
                : [...prev, sectionId]
        );
    };

    // Reordering rows logic
    const moveRowTo = (sectionId, fromIndex, toIndex) => {
        const targetSection = sections.find(s => s.id === sectionId);
        if (!targetSection || toIndex < 0 || toIndex >= targetSection.rules.length) return;

        const sectionRules = [...targetSection.rules];
        const [moved] = sectionRules.splice(fromIndex, 1);
        sectionRules.splice(toIndex, 0, moved);

        const allOrderedIds = [];
        sections.forEach(s => {
            const rulesForSec = s.id === sectionId ? sectionRules : s.rules;
            rulesForSec.forEach(r => allOrderedIds.push(r.row_id));
        });

        rules.forEach(r => {
            if (!allOrderedIds.includes(r.row_id)) {
                allOrderedIds.push(r.row_id);
            }
        });

        router.post('/synthese/reorder', { ordered_ids: allOrderedIds }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    // Helper for formatting French currency
    const formatAmount = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    // Start inline editing of a manual cell
    const startEditing = (rowId, month, currentVal) => {
        if (isFutureMonth(month)) return;
        
        // Empêcher l'édition si la ligne est calculée (verrouillage)
        const targetRule = rules.find(r => r.row_id === rowId);
        if (targetRule) {
            const config = targetRule.calculation_config || {};
            const isCalculated = Boolean(config.carry_previous_month) || (config.modules?.length || 0) > 0;
            if (isCalculated) return;
        }

        setEditingCell({ rowId, month });
        setEditInputValue(currentVal !== undefined && currentVal !== null && currentVal !== '' ? String(currentVal) : '');
    };

    const cancelEditing = () => {
        setEditingCell(null);
        setEditInputValue('');
    };

    // Save manual cell value to server
    const saveCellValue = (rowId, month) => {
        setSavingCell({ rowId, month });
        const val = editInputValue.trim() === '' ? null : parseFloat(editInputValue.replace(',', '.'));

        router.post('/synthese/value', {
            year: selectedYear,
            row_id: rowId,
            month: month,
            value: isNaN(val) ? null : val,
        }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setSavingCell(null);
                setEditingCell(null);
            }
        });
    };

    // Save initial balance (month 0)
    const saveInitialBalance = (rowId) => {
        const val = initialBalanceValue.trim() === '' ? null : parseFloat(initialBalanceValue.replace(',', '.'));
        router.post('/synthese/value', {
            year: selectedYear,
            row_id: rowId,
            month: 0,
            value: isNaN(val) ? null : val,
        }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setEditingInitialBalanceRow(null);
            }
        });
    };

    // Open cell audit modal
    const openCellAudit = (rule, monthNum) => {
        const rowData = calculatedRows[rule.row_id];
        const audit = rowData?.audits?.[monthNum];
        if (audit) {
            setSelectedAudit({
                rule,
                month: monthNum,
                monthName: months[monthNum - 1],
                audit,
            });
        }
    };

    // Reset rules
    const handleResetRules = () => {
        if (confirm('Voulez-vous réinitialiser toutes les règles de calcul de la synthèse à leurs valeurs par défaut ?')) {
            router.post('/synthese/rules/reset', {}, { preserveScroll: true });
        }
    };

    // 4 standard sections definitions
    const sections = [
        {
            id: 'encours_provisions',
            title: 'Encours et provisions',
            icon: Shield,
            colorScheme: {
                headerBg: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30',
                totalBg: 'bg-cyan-950/60 font-semibold text-cyan-200 border-cyan-500/40',
                accentText: 'text-cyan-400',
                badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
            },
            rules: rules.filter(r => r.section === 'encours_provisions'),
            totalLabel: 'Total Encours et provisions'
        },
        {
            id: 'charges_fixes',
            title: 'Charges fixes',
            icon: CreditCard,
            colorScheme: {
                headerBg: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
                totalBg: 'bg-amber-950/60 font-semibold text-amber-200 border-warning-border',
                accentText: 'text-warning',
                badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            },
            rules: rules.filter(r => r.section === 'charges_fixes'),
            totalLabel: 'Total des charges fixes'
        },
        {
            id: 'charges_variables',
            title: 'Charges variables',
            icon: ArrowDownRight,
            colorScheme: {
                headerBg: 'bg-orange-950/40 text-orange-300 border-orange-500/30',
                totalBg: 'bg-orange-950/60 font-semibold text-orange-200 border-orange-500/40',
                accentText: 'text-orange-400',
                badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/20'
            },
            rules: rules.filter(r => r.section === 'charges_variables'),
            totalLabel: 'Total des charges variables',
            extraTotals: [
                { id: 'total_charges_mois', label: 'Total des charges du mois', isGrandTotal: true }
            ]
        },
        {
            id: 'revenus',
            title: 'Revenus',
            icon: ArrowUpRight,
            colorScheme: {
                headerBg: 'bg-emerald-950/40 text-positive-light border-emerald-500/30',
                totalBg: 'bg-positive-bg font-semibold text-emerald-200 border-positive-border',
                accentText: 'text-positive',
                badgeBg: 'bg-positive/10 text-positive-light border-emerald-500/20'
            },
            rules: rules.filter(r => r.section === 'revenus'),
            totalLabel: 'Total des revenus'
        }
    ];

    const toggleAll = () => {
        if (collapsedSections.length === sections.length) {
            setCollapsedSections([]);
        } else {
            setCollapsedSections(sections.map(s => s.id));
        }
    };

    const resteAVivreRule = rules.find(r => r.row_id === 'reste_a_vivre') || {
        row_id: 'reste_a_vivre',
        label: 'Reste à vivre',
        section: 'indicateurs',
        calculation_config: { carry_previous_month: false, modules: [] }
    };
    const resteAVivreRowData = calculatedRows['reste_a_vivre'] || { balances: {}, audits: {} };

    // Calculate dynamic totals for synthesis (Charges du mois & Reste à vivre)
    const getMonthChargesTotal = (monthNum) => {
        if (isFutureMonth(monthNum)) return null;
        const fixes = totalsBySection['charges_fixes']?.[monthNum] ?? 0;
        const variables = totalsBySection['charges_variables']?.[monthNum] ?? 0;
        if (fixes === 0 && variables === 0 && totalsBySection['charges_fixes']?.[monthNum] === null) return null;
        return fixes + variables;
    };

    const getMonthResteAVivre = (monthNum) => {
        if (isFutureMonth(monthNum)) return null;
        if (calculatedRows['reste_a_vivre']?.balances?.[monthNum] !== undefined) {
            return calculatedRows['reste_a_vivre'].balances[monthNum];
        }
        const revenus = totalsBySection['revenus']?.[monthNum] ?? 0;
        const charges = getMonthChargesTotal(monthNum) ?? 0;
        if (revenus === 0 && charges === 0 && totalsBySection['revenus']?.[monthNum] === null) return null;
        return revenus - charges;
    };

    return (
        <AppLayout>
            <Head title={`Synthèse Annuelle ${selectedYear}`} />

            <div className="space-y-6">
                {/* En-tête de la page Synthèse */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface-raised/60 border border-edge/80 p-5 rounded-2xl backdrop-blur-md shadow-xl">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                            <div className="w-full h-full bg-surface rounded-[10px] flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-accent" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                Synthèse Annuelle
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-accent-light border border-accent-border">
                                    {selectedYear}
                                </span>
                            </h1>
                            <p className="text-xs text-on-surface-muted">
                                Cliquez sur n'importe quelle cellule pour inspecter son calcul détaillé et ses opérations
                            </p>
                        </div>
                    </div>

                    {/* Actions & Sélecteur d'année */}
                    <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                        {/* Bouton Etat de rapprochement */}
                        <button
                            onClick={() => setShowRapprochement(prev => !prev)}
                            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all shadow-md cursor-pointer ${
                                showRapprochement
                                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 border-teal-400 text-white shadow-teal-500/20'
                                    : 'bg-surface border-edge hover:border-teal-500/50 hover:bg-surface-elevated/80 text-teal-300'
                            }`}
                        >
                            <Scale className="w-4 h-4 text-teal-400" />
                            <span>Etat de rapprochement</span>
                        </button>

                        {/* Bouton Tout replier / Tout déplier */}
                        <button
                            onClick={toggleAll}
                            className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-surface border border-edge hover:bg-surface-elevated/80 text-on-surface-secondary hover:text-white text-xs font-medium transition-all shadow-inner cursor-pointer"
                        >
                            {collapsedSections.length === sections.length ? (
                                <>
                                    <ChevronsUpDown className="w-3.5 h-3.5 text-accent" />
                                    <span>Tout déplier</span>
                                </>
                            ) : (
                                <>
                                    <ChevronsDownUp className="w-3.5 h-3.5 text-accent" />
                                    <span>Tout replier</span>
                                </>
                            )}
                        </button>

                        {/* Sélecteur d'année */}
                        <div className="flex items-center space-x-2 bg-surface border border-edge rounded-xl p-1 shadow-inner">
                            <button
                                onClick={() => changeYear(selectedYear - 1)}
                                className="p-2 rounded-lg text-on-surface-muted hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                                title="Année précédente"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center space-x-2 px-3 py-1 font-semibold text-sm text-on-surface">
                                <Calendar className="w-4 h-4 text-accent" />
                                <span>{selectedYear}</span>
                            </div>
                            <button
                                onClick={() => changeYear(selectedYear + 1)}
                                className="p-2 rounded-lg text-on-surface-muted hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                                title="Année suivante"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bannière Guide & Audit Info */}
                <div className="bg-accent-bg border border-accent-border rounded-xl p-3.5 text-xs text-accent-light flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                    <div className="flex items-center space-x-2.5">
                        <Info className="w-4 h-4 text-accent shrink-0" />
                        <span>
                            <strong>Transparence & Calculs :</strong> Cliquez sur une cellule calculée pour inspecter sa formule et ses écritures bancaires réelles. Cliquez sur l'icône <Settings className="w-3 h-3 inline text-cyan-400 mx-0.5" /> à côté du nom d'une ligne pour modifier son mode de calcul.
                        </span>
                    </div>
                    <button
                        onClick={handleResetRules}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-raised border border-edge-strong hover:bg-surface-elevated text-[11px] text-on-surface-secondary hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Réinitialiser les règles par défaut"
                    >
                        <RotateCcw className="w-3 h-3 text-on-surface-muted" />
                        <span>Règles par défaut</span>
                    </button>
                </div>

                {/* Conteneur principal : Volet de configuration à gauche (si actif) + Tableau à droite */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    
                    {/* Volet de Configuration des Règles (à gauche, intégré sans assombrir le tableau) */}
                    {editingRule && (
                        <div className="w-full lg:w-[450px] xl:w-[490px] shrink-0 sticky top-4 z-20">
                            <RowRuleModal
                                rowRule={editingRule}
                                availableRules={rules}
                                expenseTypes={expenseTypes}
                                onClose={() => setEditingRule(null)}
                            />
                        </div>
                    )}

                    {/* Volet Etat de Rapprochement (à gauche) */}
                    {showRapprochement && (
                        <div className="w-full lg:w-[380px] xl:w-[410px] shrink-0 sticky top-4 z-20">
                            <EtatRapprochementPanel
                                selectedYear={selectedYear}
                                systemCurrentYear={systemCurrentYear}
                                systemCurrentMonth={systemCurrentMonth}
                                totalsBySection={totalsBySection}
                                onClose={() => setShowRapprochement(false)}
                            />
                        </div>
                    )}

                    {/* Tableau de synthèse annuel (pleinement visible et lumineux à droite) */}
                    <div className="flex-1 min-w-0 w-full bg-surface-raised/60 border border-edge/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            {/* En-tête du tableau : Mois */}
                            <thead>
                                <tr className="bg-surface-raised border-b border-edge text-on-surface-secondary">
                                    <th className="sticky left-0 z-20 bg-surface-raised/95 backdrop-blur px-4 py-3.5 font-bold uppercase tracking-wider text-on-surface-secondary border-r border-edge min-w-[260px] max-w-[320px]">
                                        Type d'opération / Enveloppe
                                    </th>
                                    {months.map((month, idx) => {
                                        const monthNum = idx + 1;
                                        const isFuture = isFutureMonth(monthNum);
                                        const isCurrent = isCurrentMonth(monthNum);

                                        return (
                                            <th
                                                key={month}
                                                className={`px-3 py-3.5 text-center uppercase tracking-wider min-w-[105px] last:border-r-0 transition-colors ${
                                                    isCurrent
                                                        ? 'bg-indigo-600/20 text-accent-light font-bold border-x-2 border-accent-border shadow-inner'
                                                        : isFuture 
                                                            ? 'text-on-surface-faint font-normal opacity-60 border-r border-edge/60' 
                                                            : 'text-on-surface-secondary font-semibold border-r border-edge/60'
                                                }`}
                                            >
                                                <div className="flex items-center justify-center space-x-1.5">
                                                    {isCurrent && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-sm shadow-indigo-400/80"></span>
                                                    )}
                                                    <span>{month}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            {/* Corps du tableau découpé en 4 zones */}
                            <tbody className="divide-y divide-edge/40">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    const isCollapsed = collapsedSections.includes(section.id);

                                    return (
                                        <React.Fragment key={section.id}>
                                            {/* Titre cliquable de la zone (Replier / Déplier) */}
                                            <tr 
                                                onClick={() => toggleSection(section.id)}
                                                className={`${section.colorScheme.headerBg} border-y font-semibold cursor-pointer hover:brightness-125 transition-all select-none group`}
                                            >
                                                <td
                                                    colSpan={13}
                                                    className="px-4 py-2.5 text-xs uppercase tracking-wider"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2.5">
                                                            <div className="p-1 rounded bg-surface-raised/50 group-hover:bg-surface-raised/80 transition-colors">
                                                                {isCollapsed ? (
                                                                    <ChevronRight className="w-3.5 h-3.5 text-on-surface-secondary transition-transform" />
                                                                ) : (
                                                                    <ChevronDown className="w-3.5 h-3.5 text-on-surface-secondary transition-transform" />
                                                                )}
                                                            </div>
                                                            <Icon className="w-4 h-4" />
                                                            <span className="font-bold">{section.title}</span>
                                                            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-surface-raised/60 text-on-surface-secondary border border-edge-strong/50">
                                                                {section.rules.length} lignes
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-3 pr-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAddingRowSection(section.id);
                                                                }}
                                                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-raised/80 hover:bg-surface-elevated text-xs font-medium text-white border border-edge hover:border-accent/40 shadow-sm transition-all cursor-pointer"
                                                                title={`Ajouter une ligne dans ${section.title}`}
                                                            >
                                                                <Plus className="w-3.5 h-3.5 text-accent" />
                                                                <span>Ajouter une ligne</span>
                                                            </button>
                                                            <span className="text-[11px] font-normal text-on-surface-muted group-hover:text-on-surface transition-colors">
                                                                {isCollapsed ? 'Cliquer pour déplier' : 'Cliquer pour replier'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Lignes de détail de la zone */}
                                            {!isCollapsed && section.rules.map((rule, ruleIdx) => {
                                                const rowData = calculatedRows[rule.row_id] || { balances: {}, audits: {} };
                                                const balances = rowData.balances || {};
                                                const config = rule.calculation_config || {};
                                                const hasModules = (config.modules?.length || 0) > 0;
                                                const isCarry = Boolean(config.carry_previous_month);
                                                const isCalculated = isCarry || hasModules;

                                                return (
                                                    <tr
                                                        key={rule.row_id}
                                                        draggable={true}
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('text/plain', JSON.stringify({ sectionId: section.id, index: ruleIdx }));
                                                        }}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            try {
                                                                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                                                                if (data.sectionId === section.id && data.index !== ruleIdx) {
                                                                    moveRowTo(section.id, data.index, ruleIdx);
                                                                }
                                                            } catch (err) {}
                                                        }}
                                                        className="hover:bg-surface-elevated/30 transition-colors group"
                                                    >
                                                        {/* Libellé de la ligne avec actions */}
                                                        <td className={`sticky left-0 z-10 bg-surface-raised/95 backdrop-blur px-4 py-2 border-r border-edge group-hover:bg-surface-elevated flex items-center justify-between ${
                                                            rule.is_italic ? 'italic text-cyan-300/90 pl-6' : 'text-on-surface'
                                                        }`}>
                                                            <div className="flex items-center space-x-2 truncate">
                                                                <GripVertical className="w-3.5 h-3.5 text-on-surface-muted/40 group-hover:text-on-surface-muted cursor-grab shrink-0 transition-colors" title="Glisser-déposer pour réordonner" />
                                                                <span className="font-medium truncate" title={rule.label}>{rule.label}</span>
                                                                {isCarry && (
                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                                                                        Cumul M-1
                                                                    </span>
                                                                )}
                                                                {!isCarry && hasModules && (
                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-bg text-accent-light border border-accent-border">
                                                                        Formule
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {/* Boutons de réordonnancement Monter / Descendre */}
                                                                <div className="flex items-center space-x-0.5 border-r border-edge/60 pr-1 mr-0.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            moveRowTo(section.id, ruleIdx, ruleIdx - 1);
                                                                        }}
                                                                        disabled={ruleIdx === 0}
                                                                        className="p-1 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                                                        title="Monter cette ligne"
                                                                    >
                                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            moveRowTo(section.id, ruleIdx, ruleIdx + 1);
                                                                        }}
                                                                        disabled={ruleIdx === section.rules.length - 1}
                                                                        className="p-1 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                                                        title="Descendre cette ligne"
                                                                    >
                                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>

                                                                {isCarry && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingInitialBalanceRow({ rowId: rule.row_id, label: rule.label });
                                                                            setInitialBalanceValue(String(rowData.initial_balance ?? 0));
                                                                        }}
                                                                        className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition-all flex items-center space-x-1 cursor-pointer"
                                                                        title="Modifier le solde initial (report N-1)"
                                                                    >
                                                                        <Edit2 className="w-2.5 h-2.5" />
                                                                        <span>N-1: {formatAmount(rowData.initial_balance)}</span>
                                                                    </button>
                                                                )}
                                                                
                                                                <button
                                                                    onClick={() => setEditingRule(rule)}
                                                                    className="p-1 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                                                                    title="Configurer la formule de calcul de cette ligne"
                                                                >
                                                                    <Settings className="w-3.5 h-3.5 text-on-surface-muted hover:text-cyan-400 transition-colors" />
                                                                </button>

                                                                <button
                                                                    onClick={() => setRowToDelete(rule)}
                                                                    className="p-1 rounded text-on-surface-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                                    title="Supprimer cette ligne"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 text-on-surface-muted hover:text-rose-400 transition-colors" />
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* 12 Colonnes Mois */}
                                                        {months.map((m, mIdx) => {
                                                            const monthNum = mIdx + 1;
                                                            const isFuture = isFutureMonth(monthNum);
                                                            const isCurrent = isCurrentMonth(monthNum);
                                                            const bal = balances[monthNum];
                                                            const isNegative = bal < 0;
                                                            const isEditing = editingCell?.rowId === rule.row_id && editingCell?.month === monthNum;
                                                            const isSaving = savingCell?.rowId === rule.row_id && savingCell?.month === monthNum;

                                                            if (isFuture) {
                                                                return (
                                                                    <td
                                                                        key={monthNum}
                                                                        className="px-3 py-2 text-right border-r border-edge/40 last:border-r-0 select-none bg-surface/20"
                                                                    >
                                                                        {/* Mois futur */}
                                                                    </td>
                                                                );
                                                            }

                                                            // 1. Ligne calculée (Cumul ou Formule modulaire) : Clic = Inspecteur d'audit (verrouillée à la saisie)
                                                            if (isCalculated) {
                                                                return (
                                                                    <td
                                                                        key={monthNum}
                                                                        onClick={() => openCellAudit(rule, monthNum)}
                                                                        className={`px-3 py-2 text-right font-mono font-medium last:border-r-0 transition-colors cursor-pointer group/cell ${
                                                                            isCurrent 
                                                                                ? 'bg-indigo-500/10 border-x-2 border-accent-border hover:bg-indigo-500/20' 
                                                                                : 'border-r border-edge/40 hover:bg-indigo-600/10 hover:text-accent-light'
                                                                        } ${
                                                                            bal === undefined || bal === null 
                                                                                ? 'text-on-surface-faint' 
                                                                                : isNegative 
                                                                                    ? 'text-negative font-semibold' 
                                                                                    : isCurrent ? 'text-accent-light font-semibold' : 'text-on-surface'
                                                                        }`}
                                                                        title="Cellule calculée automatiquement (verrouillée) - Cliquer pour inspecter la formule et le détail"
                                                                    >
                                                                        <div className="flex items-center justify-end space-x-1">
                                                                            <span>{bal !== undefined && bal !== null ? formatAmount(bal) : '-'}</span>
                                                                            <Info className="w-2.5 h-2.5 text-on-surface-faint opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                                        </div>
                                                                    </td>
                                                                );
                                                            }

                                                            // 2. Saisie manuelle : Clic = Édition inline, Double-clic/Info = Inspecteur
                                                            const manualVal = bal;
                                                            return (
                                                                <td
                                                                    key={monthNum}
                                                                    onClick={() => !isEditing && startEditing(rule.row_id, monthNum, manualVal)}
                                                                    onDoubleClick={() => openCellAudit(rule, monthNum)}
                                                                    className={`px-3 py-2 text-right font-mono last:border-r-0 cursor-pointer transition-colors ${
                                                                        isCurrent 
                                                                            ? 'bg-indigo-500/10 border-x-2 border-accent-border hover:bg-indigo-500/20' 
                                                                            : 'border-r border-edge/40 hover:bg-indigo-600/10 hover:text-accent-light'
                                                                    } ${
                                                                        isEditing ? 'bg-accent-bg p-1' : ''
                                                                    } ${
                                                                        manualVal !== undefined && manualVal !== null && manualVal !== 0 
                                                                            ? rule.is_provision 
                                                                                ? 'text-cyan-300 font-medium' 
                                                                                : manualVal < 0 ? 'text-amber-300 font-medium' : isCurrent ? 'text-accent-light font-medium' : 'text-on-surface'
                                                                            : 'text-on-surface-faint'
                                                                    }`}
                                                                    title="Saisie manuelle - Cliquer pour modifier, double-cliquer pour voir le détail"
                                                                >
                                                                    {isEditing ? (
                                                                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="text"
                                                                                autoFocus
                                                                                value={editInputValue}
                                                                                onChange={(e) => setEditInputValue(e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') saveCellValue(rule.row_id, monthNum);
                                                                                    if (e.key === 'Escape') cancelEditing();
                                                                                }}
                                                                                onBlur={() => saveCellValue(rule.row_id, monthNum)}
                                                                                placeholder="0.00"
                                                                                className="w-full bg-surface border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-right text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                                                                            />
                                                                        </div>
                                                                    ) : isSaving ? (
                                                                        <span className="text-[10px] text-accent animate-pulse">...</span>
                                                                    ) : (
                                                                        manualVal !== undefined && manualVal !== null ? formatAmount(manualVal) : '-'
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}

                                            {/* Ligne Total de la zone */}
                                            <tr className={`${section.colorScheme.totalBg} border-t`}>
                                                <td className={`sticky left-0 z-10 ${section.colorScheme.totalBg} backdrop-blur px-4 py-2.5 border-r border-edge ${section.colorScheme.accentText}`}>
                                                    {section.totalLabel}
                                                </td>
                                                {months.map((m, mIdx) => {
                                                    const monthNum = mIdx + 1;
                                                    const isFuture = isFutureMonth(monthNum);
                                                    const isCurrent = isCurrentMonth(monthNum);
                                                    const totalVal = totalsBySection[section.id]?.[monthNum];

                                                    if (isFuture) {
                                                        return (
                                                            <td
                                                                key={monthNum}
                                                                className="px-3 py-2.5 text-right border-r border-edge/60 last:border-r-0 select-none bg-surface/20"
                                                            >
                                                                {/* Mois futur */}
                                                            </td>
                                                        );
                                                    }

                                                    return (
                                                        <td
                                                            key={monthNum}
                                                            className={`px-3 py-2.5 text-right font-mono font-bold last:border-r-0 transition-colors ${
                                                                isCurrent 
                                                                    ? 'bg-indigo-500/20 border-x-2 border-accent-border text-accent-light' 
                                                                    : `border-r border-edge/60 ${section.colorScheme.accentText}`
                                                            }`}
                                                            title={`${section.totalLabel} (calculé automatiquement)`}
                                                        >
                                                            {totalVal !== null && totalVal !== undefined ? formatAmount(totalVal) : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* Lignes de totaux supplémentaires (Total des charges du mois) */}
                                            {section.extraTotals && section.extraTotals.map((extra) => (
                                                <tr key={extra.id} className="bg-orange-950/80 border-t border-orange-500/40 text-orange-200 font-bold">
                                                    <td className="sticky left-0 z-10 bg-orange-950/90 backdrop-blur px-4 py-2.5 border-r border-edge text-orange-300 uppercase tracking-wide">
                                                        {extra.label}
                                                    </td>
                                                    {months.map((m, mIdx) => {
                                                        const monthNum = mIdx + 1;
                                                        const isFuture = isFutureMonth(monthNum);
                                                        const isCurrent = isCurrentMonth(monthNum);
                                                        const grandTotal = getMonthChargesTotal(monthNum);

                                                        if (isFuture) {
                                                            return (
                                                                <td
                                                                    key={monthNum}
                                                                    className="px-3 py-2.5 text-right border-r border-edge/60 last:border-r-0 select-none bg-surface/20"
                                                                >
                                                                    {/* Mois futur */}
                                                                </td>
                                                            );
                                                        }

                                                        return (
                                                            <td
                                                                key={monthNum}
                                                                className={`px-3 py-2.5 text-right font-mono font-bold text-orange-300 last:border-r-0 ${
                                                                    isCurrent 
                                                                        ? 'bg-indigo-500/20 border-x-2 border-accent-border text-orange-200' 
                                                                        : 'border-r border-edge/60'
                                                                }`}
                                                                title={`${extra.label} (calculé automatiquement)`}
                                                            >
                                                                {grandTotal !== null ? formatAmount(grandTotal) : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}

                                {/* Ligne finale : Reste à vivre */}
                                <tr className="bg-accent-bg border-t-2 border-accent-border font-bold text-accent-light text-sm shadow-lg group">
                                    <td className="sticky left-0 z-10 bg-accent-bg backdrop-blur px-4 py-3 border-r border-edge text-accent-light uppercase tracking-wide flex items-center justify-between">
                                        <div className="flex items-center space-x-2 truncate">
                                            <Wallet className="w-4 h-4 text-accent shrink-0" />
                                            <span className="truncate">{resteAVivreRule.label || 'Reste à vivre'}</span>
                                            {resteAVivreRule.calculation_config?.carry_previous_month && (
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 normal-case font-normal shrink-0">
                                                    Cumul M-1
                                                </span>
                                            )}
                                            {!resteAVivreRule.calculation_config?.carry_previous_month && (resteAVivreRule.calculation_config?.modules?.length || 0) > 0 && (
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-bg text-accent-light border border-accent-border normal-case font-normal shrink-0">
                                                    Formule
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {resteAVivreRule.calculation_config?.carry_previous_month && (
                                                <button
                                                    onClick={() => {
                                                        setEditingInitialBalanceRow({ rowId: 'reste_a_vivre', label: resteAVivreRule.label });
                                                        setInitialBalanceValue(String(resteAVivreRowData.initial_balance ?? 0));
                                                    }}
                                                    className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition-all flex items-center space-x-1 cursor-pointer normal-case font-normal"
                                                    title="Modifier le solde initial (report N-1)"
                                                >
                                                    <Edit2 className="w-2.5 h-2.5" />
                                                    <span>N-1: {formatAmount(resteAVivreRowData.initial_balance)}</span>
                                                </button>
                                            )}
                                            
                                            <button
                                                onClick={() => setEditingRule(resteAVivreRule)}
                                                className="p-1 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                                                title="Configurer le calcul du Reste à vivre"
                                            >
                                                <Settings className="w-3.5 h-3.5 text-on-surface-muted hover:text-cyan-400 transition-colors" />
                                            </button>
                                        </div>
                                    </td>
                                    {months.map((m, mIdx) => {
                                        const monthNum = mIdx + 1;
                                        const isFuture = isFutureMonth(monthNum);
                                        const isCurrent = isCurrentMonth(monthNum);
                                        const reste = getMonthResteAVivre(monthNum);

                                        if (isFuture) {
                                            return (
                                                <td
                                                    key={monthNum}
                                                    className="px-3 py-3 text-right border-r border-edge/60 last:border-r-0 select-none bg-surface/20"
                                                >
                                                    {/* Mois futur */}
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={monthNum}
                                                onClick={() => openCellAudit(resteAVivreRule, monthNum)}
                                                className={`px-3 py-3 text-right font-mono font-bold last:border-r-0 cursor-pointer group/cell transition-colors ${
                                                    isCurrent 
                                                        ? 'bg-indigo-600/30 border-x-2 border-accent-border text-white font-extrabold shadow-inner hover:bg-indigo-600/40' 
                                                        : reste < 0 ? 'border-r border-edge/60 text-negative hover:bg-rose-950/30' : 'border-r border-edge/60 text-accent-light hover:bg-indigo-950/40'
                                                }`}
                                                title="Reste à vivre calculé automatiquement (verrouillé) - Cliquer pour inspecter la formule et le détail"
                                            >
                                                <div className="flex items-center justify-end space-x-1">
                                                    <span>{reste !== null ? formatAmount(reste) : '-'}</span>
                                                    <Info className="w-2.5 h-2.5 text-accent opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

            {/* Modal d'Audit / Inspecteur de Cellule */}
            {selectedAudit && (
                <CellAuditModal
                    audit={selectedAudit.audit}
                    rowRule={selectedAudit.rule}
                    year={selectedYear}
                    monthName={selectedAudit.monthName}
                    onClose={() => setSelectedAudit(null)}
                    onOpenRuleSettings={(rule) => {
                        setSelectedAudit(null);
                        setEditingRule(rule);
                    }}
                />
            )}

            {/* Modal de modification du solde initial (report N-1) */}
            {editingInitialBalanceRow && (
                <div className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface-raised border border-edge rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-edge pb-3">
                            <div className="flex items-center space-x-2">
                                <Shield className="w-5 h-5 text-cyan-400" />
                                <h3 className="font-bold text-white text-base">
                                    Solde initial : {editingInitialBalanceRow.label}
                                </h3>
                            </div>
                            <button
                                onClick={() => setEditingInitialBalanceRow(null)}
                                className="p-1 rounded-lg text-on-surface-muted hover:text-white hover:bg-surface-elevated transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-on-surface-secondary">
                            Définissez la valeur de départ au 1er janvier {selectedYear} (report de décembre de l'année précédente ou saisie manuelle).
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-on-surface-muted uppercase tracking-wider mb-1">
                                Montant initial (€)
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={initialBalanceValue}
                                onChange={(e) => setInitialBalanceValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveInitialBalance(editingInitialBalanceRow.rowId);
                                    if (e.key === 'Escape') setEditingInitialBalanceRow(null);
                                }}
                                placeholder="ex: 15000.00"
                                className="w-full bg-surface border border-edge-strong rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                            />
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingInitialBalanceRow(null)}
                                className="px-4 py-2 rounded-xl bg-surface-elevated text-on-surface-secondary hover:text-white text-xs font-medium transition-colors cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={() => saveInitialBalance(editingInitialBalanceRow.rowId)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'ajout d'une nouvelle ligne */}
            {addingRowSection && (
                <AddRowModal
                    initialSection={addingRowSection}
                    onClose={() => setAddingRowSection(null)}
                />
            )}

            {/* Modal de confirmation d'avertissement avant suppression */}
            {rowToDelete && (
                <ConfirmDeleteRowModal
                    rule={rowToDelete}
                    onClose={() => setRowToDelete(null)}
                />
            )}
        </AppLayout>
    );
}
