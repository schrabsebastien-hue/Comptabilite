import React, { useMemo } from 'react';
import {
    Calendar,
    Filter,
    Tag,
    TrendingUp,
    TrendingDown,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Layers,
    Check
} from 'lucide-react';

// Helper robust for extracting YYYY-MM key from any date format
const getYearMonthKey = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    const matchIso = str.match(/^(\d{4})-(\d{2})/);
    if (matchIso) return `${matchIso[1]}-${matchIso[2]}`;
    const matchFr = str.match(/^\d{2}[\/\.-](\d{2})[\/\.-](\d{4})/);
    if (matchFr) return `${matchFr[2]}-${matchFr[1]}`;
    return null;
};

// Format YYYY-MM to French month label safely (day 15 avoids UTC timezone shifts)
const formatYearMonthLabel = (yearMonthStr) => {
    if (!yearMonthStr) return '';
    const [year, month] = yearMonthStr.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 15);
    const label = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
};

export default function QuickFiltersSidebar({
    operations = [],
    selectedMonth = null,
    onSelectMonth,
    expenseTypes = [],
    selectedExpenseTypeIds = [],
    onSelectExpenseTypeId,
    amountType = 'all',
    onSelectAmountType,
    hasActiveFilters = false,
    onClearAllFilters,
    isCollapsed = false,
    onToggleCollapse,
}) {
    // Extract & calculate monthly statistics from operations
    const monthStats = useMemo(() => {
        const map = new Map();

        operations.forEach((op) => {
            const monthKey = getYearMonthKey(op.date);
            if (!monthKey) return;

            if (!map.has(monthKey)) {
                map.set(monthKey, {
                    key: monthKey,
                    label: formatYearMonthLabel(monthKey),
                    year: monthKey.substring(0, 4),
                    count: 0,
                    credits: 0,
                    debits: 0,
                    balance: 0,
                });
            }

            const item = map.get(monthKey);
            item.count += 1;
            const amt = parseFloat(op.amount) || 0;
            if (amt > 0) item.credits += amt;
            else item.debits += amt;
            item.balance += amt;
        });

        // Convert map to array and sort chronologically descending
        return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [operations]);

    const formatAmountShort = (num) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(num);
    };

    if (isCollapsed) {
        return (
            <div className="bg-surface-raised/80 border border-edge rounded-2xl p-2.5 flex flex-col items-center space-y-4 shadow-xl backdrop-blur-sm self-start transition-all">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 rounded-xl bg-surface-elevated text-on-surface-secondary hover:bg-surface-overlay hover:text-white transition cursor-pointer"
                    title="Déplier le volet de filtres"
                >
                    <ChevronRight className="w-5 h-5 text-accent" />
                </button>
                <div className="w-8 h-px bg-surface-elevated" />
                <button
                    onClick={onToggleCollapse}
                    className={`p-2.5 rounded-xl transition cursor-pointer relative ${
                        selectedMonth ? 'bg-indigo-600/20 text-accent border border-accent-border' : 'text-on-surface-muted hover:bg-surface-elevated'
                    }`}
                    title="Filtre par mois"
                >
                    <Calendar className="w-5 h-5" />
                    {selectedMonth && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                </button>
                <button
                    onClick={onToggleCollapse}
                    className={`p-2.5 rounded-xl transition cursor-pointer ${
                        amountType !== 'all' ? 'bg-indigo-600/20 text-accent border border-accent-border' : 'text-on-surface-muted hover:bg-surface-elevated'
                    }`}
                    title="Filtre par type de flux"
                >
                    <Layers className="w-5 h-5" />
                </button>
                {hasActiveFilters && (
                    <button
                        onClick={onClearAllFilters}
                        className="p-2.5 rounded-xl bg-rose-500/15 text-negative hover:bg-rose-500/25 transition cursor-pointer mt-auto"
                        title="Effacer les filtres"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <aside className="w-full lg:w-72 shrink-0 space-y-5 bg-surface-raised/80 border border-edge rounded-2xl p-4 shadow-xl backdrop-blur-sm transition-all self-start">
            {/* Header section with collapse toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-edge">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-accent">
                        <Filter className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-on-surface">
                        Filtres & Raccourcis
                    </span>
                </div>
                <div className="flex items-center space-x-1">
                    {hasActiveFilters && (
                        <button
                            onClick={onClearAllFilters}
                            className="p-1.5 rounded-lg text-on-surface-muted hover:text-negative hover:bg-negative/10 transition cursor-pointer text-xs"
                            title="Réinitialiser tous les filtres"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={onToggleCollapse}
                        className="p-1.5 rounded-lg text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated transition cursor-pointer"
                        title="Replier le volet"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* SECTION 1: Filtre visuel par Mois de l'année */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Mois de l'année</span>
                    </div>
                    {selectedMonth && (
                        <button
                            onClick={() => onSelectMonth(null)}
                            className="text-[11px] text-on-surface-muted hover:text-accent transition"
                        >
                            Réinitialiser
                        </button>
                    )}
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {/* Option: Tous les mois */}
                    <button
                        onClick={() => onSelectMonth(null)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer border ${
                            selectedMonth === null
                                ? 'bg-indigo-600/20 text-accent-light border-accent-border shadow-sm'
                                : 'bg-surface/40 text-on-surface-secondary border-edge/80 hover:bg-surface-elevated/60 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${selectedMonth === null ? 'bg-accent' : 'bg-on-surface-faint'}`} />
                            <span>Tous les mois</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-surface-elevated text-on-surface-muted font-mono">
                            {operations.length}
                        </span>
                    </button>

                    {/* Liste des mois détectés */}
                    {monthStats.length === 0 ? (
                        <div className="p-3 text-center text-xs text-on-surface-faint italic">
                            Aucune donnée de date disponible
                        </div>
                    ) : (
                        monthStats.map((item) => {
                            const isSelected = selectedMonth === item.key;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => onSelectMonth(isSelected ? null : item.key)}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer border group ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-indigo-600/25 to-purple-600/20 text-white border-accent-border shadow-md shadow-indigo-500/10'
                                            : 'bg-surface/40 text-on-surface-secondary border-edge/80 hover:bg-surface-elevated/60 hover:border-edge-strong hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center space-x-2 min-w-0">
                                        <div
                                            className={`w-2 h-2 rounded-full shrink-0 transition ${
                                                isSelected ? 'bg-accent scale-110' : 'bg-on-surface-faint group-hover:bg-accent'
                                            }`}
                                        />
                                        <span className="truncate">{item.label}</span>
                                    </div>

                                    <div className="flex items-center space-x-1.5 shrink-0">
                                        <span
                                            className={`text-[10px] font-mono font-medium ${
                                                item.balance >= 0 ? 'text-positive/90' : 'text-on-surface-muted'
                                            }`}
                                        >
                                            {formatAmountShort(item.balance)}
                                        </span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                                isSelected ? 'bg-indigo-500/30 text-accent-light' : 'bg-surface-elevated/80 text-on-surface-muted'
                                            }`}
                                        >
                                            {item.count}
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="w-full h-px bg-surface-elevated/80" />

            {/* SECTION 2: Type de Flux (Recettes / Dépenses) */}
            <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Type de flux</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                        onClick={() => onSelectAmountType('all')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium text-center transition cursor-pointer border ${
                            amountType === 'all'
                                ? 'bg-indigo-600/20 text-accent-light border-accent-border'
                                : 'bg-surface/40 text-on-surface-muted border-edge hover:bg-surface-elevated hover:text-on-surface'
                        }`}
                    >
                        Tous
                    </button>
                    <button
                        onClick={() => onSelectAmountType('credit')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium text-center transition flex items-center justify-center space-x-1 cursor-pointer border ${
                            amountType === 'credit'
                                ? 'bg-emerald-600/20 text-positive-light border-positive-border'
                                : 'bg-surface/40 text-on-surface-muted border-edge hover:bg-surface-elevated hover:text-positive'
                        }`}
                    >
                        <TrendingUp className="w-3 h-3 text-positive" />
                        <span>Crédits</span>
                    </button>
                    <button
                        onClick={() => onSelectAmountType('debit')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium text-center transition flex items-center justify-center space-x-1 cursor-pointer border ${
                            amountType === 'debit'
                                ? 'bg-rose-600/20 text-negative-light border-negative-border'
                                : 'bg-surface/40 text-on-surface-muted border-edge hover:bg-surface-elevated hover:text-negative'
                        }`}
                    >
                        <TrendingDown className="w-3 h-3 text-negative" />
                        <span>Débits</span>
                    </button>
                </div>
            </div>

            {/* SECTION 3: Raccourcis par Type de dépense */}
            {expenseTypes.length > 0 && (
                <>
                    <div className="w-full h-px bg-surface-elevated/80" />
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
                                <Tag className="w-3.5 h-3.5" />
                                <span>Raccourcis Catégories</span>
                            </div>
                            {selectedExpenseTypeIds.length > 0 && (
                                <button
                                    onClick={() => onSelectExpenseTypeId(null)}
                                    className="text-[11px] text-on-surface-muted hover:text-accent transition"
                                >
                                    Effacer
                                </button>
                            )}
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {/* Non catégorisé pill */}
                            {(() => {
                                const isSelected = selectedExpenseTypeIds.includes('none');
                                return (
                                    <button
                                        onClick={() => onSelectExpenseTypeId('none')}
                                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer border ${
                                            isSelected
                                                ? 'bg-amber-500/20 text-amber-300 border-warning-border'
                                                : 'bg-surface/40 text-on-surface-muted border-edge hover:bg-surface-elevated hover:text-on-surface'
                                        }`}
                                    >
                                        <span className="italic">Non catégorisé</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-warning" />}
                                    </button>
                                );
                            })()}

                            {/* Expense Types list */}
                            {expenseTypes.map((type) => {
                                const isSelected = selectedExpenseTypeIds.includes(String(type.id));
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => onSelectExpenseTypeId(String(type.id))}
                                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer border ${
                                            isSelected
                                                ? 'bg-indigo-600/20 text-accent-light border-accent-border'
                                                : 'bg-surface/40 text-on-surface-muted border-edge hover:bg-surface-elevated hover:text-on-surface'
                                        }`}
                                    >
                                        <span className="truncate">{type.name}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
}
