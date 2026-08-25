import React, { useState, useEffect, useRef, useMemo } from 'react';
import { router, Head } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import {
    BarChart3,
    TrendingDown,
    TrendingUp,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowDown,
    ArrowUp,
    Layers,
    PieChart,
    CreditCard,
    DollarSign,
    Sparkles,
    Eye,
    EyeOff,
    SlidersHorizontal,
    AlignHorizontalJustifyStart,
    AlignVerticalJustifyStart,
    Wallet,
    Check,
    CheckCircle2,
    ArrowLeftRight,
    LayoutGrid,
    BarChart2
} from 'lucide-react';
import ChartJS from 'chart.js/auto';

// French month labels
const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const formatCurrency = (val) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val || 0);
};

// Helper: read CSS custom properties for Chart.js theme-aware colors
function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
        text: style.getPropertyValue('--on-surface').trim(),
        textSecondary: style.getPropertyValue('--on-surface-secondary').trim(),
        textMuted: style.getPropertyValue('--on-surface-muted').trim(),
        surface: style.getPropertyValue('--surface').trim(),
        surfaceRaised: style.getPropertyValue('--surface-raised').trim(),
        edge: style.getPropertyValue('--edge').trim(),
        edgeStrong: style.getPropertyValue('--edge-strong').trim(),
        gridLine: style.getPropertyValue('--edge').trim(),
    };
}

// Component for a Monthly Stacked Bar Chart (like the Google Sheets / Excel charts in PJ)
function MonthlyStackedSectionChart({ sectionData }) {
    const canvasRef = useRef(null);
    const chartInstance = useRef(null);

    const { section_title, is_negative, datasets = [], monthly_totals = [] } = sectionData || {};

    // Filter out datasets that have strictly zero values everywhere
    const activeDatasets = useMemo(() => {
        return datasets.filter(ds => ds.data && ds.data.some(v => Math.abs(v) > 0.001));
    }, [datasets]);

    useEffect(() => {
        if (!canvasRef.current || !sectionData) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const chartDatasets = activeDatasets.map(ds => {
            return {
                label: ds.label,
                data: ds.data,
                backgroundColor: ds.color,
                borderColor: ds.color,
                borderWidth: 1,
                borderRadius: 2,
                stack: 'section_stack',
            };
        });

        const tc = getThemeColors();

        const ctx = canvasRef.current.getContext('2d');
        chartInstance.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: MONTH_NAMES,
                datasets: chartDatasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 600,
                    easing: 'easeOutQuart',
                },
                layout: {
                    padding: {
                        top: 15,
                        right: 15,
                        bottom: 10,
                        left: 10,
                    },
                },
                plugins: {
                    title: {
                        display: true,
                        text: section_title,
                        color: tc.text,
                        font: {
                            size: 16,
                            weight: '600',
                            family: 'inherit',
                        },
                        padding: {
                            top: 5,
                            bottom: 15,
                        },
                    },
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            color: tc.textSecondary,
                            font: { size: 11 },
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 10,
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                        },
                    },
                    tooltip: {
                        backgroundColor: tc.surfaceRaised,
                        titleColor: tc.text,
                        bodyColor: tc.textSecondary,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        borderColor: tc.edgeStrong,
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                const val = context.parsed.y;
                                if (Math.abs(val) < 0.001) return null;
                                return ` ${context.dataset.label} : ${formatCurrency(val)}`;
                            },
                            footer: function (tooltipItems) {
                                let sum = 0;
                                tooltipItems.forEach(function (tooltipItem) {
                                    sum += tooltipItem.parsed.y;
                                });
                                return `Total ${MONTH_NAMES[tooltipItems[0].dataIndex]} : ${formatCurrency(sum)}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            color: tc.edge + '40',
                            drawBorder: false,
                        },
                        ticks: {
                            color: tc.textMuted,
                            font: { size: 11 },
                        },
                    },
                    y: {
                        stacked: true,
                        grid: {
                            color: tc.edge + '59',
                            drawBorder: false,
                        },
                        ticks: {
                            color: tc.textMuted,
                            font: { size: 11 },
                            callback: function (val) {
                                return formatCurrency(val);
                            },
                        },
                    },
                },
            },
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [activeDatasets, section_title, is_negative]);

    return (
        <div className="bg-surface-raised/80 border border-edge/90 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
            <div className="relative w-full h-[400px]">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}

// Sub-component for an isolated Bar Chart (Annual Summary Category View)
function CategoryBarChart({
    title,
    type = 'expense',
    items = [],
    totalAmount = 0,
    orientation = 'horizontal',
    highlightedId = null,
    onHover = () => {},
}) {
    const canvasRef = useRef(null);
    const chartInstance = useRef(null);

    const getCategoryColor = (item, index) => {
        if (item.is_uncategorized) return '#94a3b8';
        if (item.color && item.color.trim() !== '') return item.color;

        if (type === 'revenue') {
            const revenueColors = ['#10b981', '#059669', '#34d399', '#0d9488', '#14b8a6', '#047857'];
            return revenueColors[index % revenueColors.length];
        }

        const expenseColors = [
            '#6366f1', '#ec4899', '#3b82f6', '#f59e0b',
            '#8b5cf6', '#f97316', '#06b6d4', '#e11d48',
            '#84cc16', '#a855f7', '#0ea5e9', '#d946ef', '#64748b'
        ];
        return expenseColors[index % expenseColors.length];
    };

    useEffect(() => {
        if (!canvasRef.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const labels = items.map(c => c.name);
        const dataValues = items.map(c => c.display_amount);
        const backgroundColors = items.map((c, i) => {
            const base = getCategoryColor(c, i);
            if (highlightedId && highlightedId !== c.id) {
                return base + '33';
            }
            return base + 'dd';
        });
        const borderColors = items.map((c, i) => getCategoryColor(c, i));

        const isHorizontal = orientation === 'horizontal';
        const tc = getThemeColors();

        const ctx = canvasRef.current.getContext('2d');
        chartInstance.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: type === 'revenue' ? 'Montant reçu (€)' : 'Montant dépensé (€)',
                        data: dataValues,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: isHorizontal ? 26 : 40,
                    },
                ],
            },
            options: {
                indexAxis: isHorizontal ? 'y' : 'x',
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500,
                    easing: 'easeOutQuart',
                },
                layout: {
                    padding: {
                        top: 5,
                        right: 15,
                        bottom: 5,
                        left: 5,
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: tc.surfaceRaised,
                        titleColor: tc.text,
                        bodyColor: tc.textSecondary,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        borderColor: type === 'revenue' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                        borderWidth: 1,
                        displayColors: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        boxPadding: 4,
                        callbacks: {
                            label: function (context) {
                                const index = context.dataIndex;
                                const cat = items[index];
                                const formattedVal = formatCurrency(cat.display_amount);
                                const isRev = type === 'revenue';
                                const pct = (cat.calculatedPercentage || 0).toFixed(1);
                                const ops = cat.operations_count || 0;

                                const lines = [
                                    ` ${isRev ? 'Revenu' : 'Dépense'} : ${formattedVal} (${pct}% du total ${isRev ? 'revenus' : 'dépenses'})`,
                                    ` Opérations : ${ops}`,
                                ];

                                if (cat.total_debits > 0 && cat.total_credits > 0) {
                                    lines.push(` Débits: ${formatCurrency(cat.total_debits)} | Crédits: ${formatCurrency(cat.total_credits)}`);
                                }

                                return lines;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            color: tc.edge + '59',
                            drawBorder: false,
                        },
                        ticks: {
                            color: tc.textMuted,
                            font: { size: 11 },
                            callback: function (val) {
                                if (isHorizontal) {
                                    return val >= 1000 ? `${(val / 1000).toFixed(0)} k€` : `${val} €`;
                                }
                                return val;
                            },
                        },
                    },
                    y: {
                        grid: {
                            color: isHorizontal ? 'transparent' : tc.edge + '59',
                            drawBorder: false,
                        },
                        ticks: {
                            color: tc.textMuted,
                            font: { size: 11 },
                            autoSkip: false,
                            callback: function (val, index) {
                                if (!isHorizontal) {
                                    return val >= 1000 ? `${(val / 1000).toFixed(0)} k€` : `${val} €`;
                                }
                                const lbl = labels[index] || '';
                                return lbl.length > 24 ? lbl.substring(0, 22) + '...' : lbl;
                            },
                        },
                    },
                },
            },
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [items, orientation, highlightedId, type]);

    const dynamicHeight = useMemo(() => {
        if (orientation === 'vertical') return '380px';
        const itemCount = items.length;
        const calcHeight = Math.max(300, itemCount * 34 + 60);
        return `${calcHeight}px`;
    }, [orientation, items.length]);

    const isRev = type === 'revenue';

    return (
        <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-sm flex flex-col h-full ${
            isRev 
                ? 'bg-surface-raised/80 border-emerald-500/30 shadow-lg shadow-emerald-950/20' 
                : 'bg-surface-raised/80 border-rose-500/30 shadow-lg shadow-rose-950/20'
        }`}>
            {/* Zone Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-edge/80">
                <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl border ${
                        isRev 
                            ? 'bg-positive/10 border-emerald-500/30 text-positive' 
                            : 'bg-negative/10 border-rose-500/30 text-negative'
                    }`}>
                        {isRev ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                        <h3 className={`text-base font-bold flex items-center gap-2 ${isRev ? 'text-positive-light' : 'text-negative-light'}`}>
                            {title}
                        </h3>
                        <span className="text-[11px] text-on-surface-muted">
                            {items.length} catégorie{items.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[11px] text-on-surface-muted uppercase tracking-wider block font-medium">Total zone</span>
                    <span className={`text-lg sm:text-xl font-bold tracking-tight ${isRev ? 'text-positive' : 'text-negative'}`}>
                        {formatCurrency(totalAmount)}
                    </span>
                </div>
            </div>

            {/* Zone Chart */}
            {items.length > 0 ? (
                <div className="relative w-full flex-1" style={{ minHeight: dynamicHeight }}>
                    <canvas ref={canvasRef} />
                </div>
            ) : (
                <div className="py-12 text-center text-on-surface-faint flex flex-col items-center justify-center space-y-2">
                    <p className="text-xs">Aucun {isRev ? 'revenu' : 'dépense'} pour cette sélection.</p>
                </div>
            )}
        </div>
    );
}

export default function Index({
    selectedYear,
    availableYears = [],
    categoriesStats = [],
    monthlyCharts = {},
    summaryStats = {}
}) {
    // Mode: 'monthly_sections' (PJ format) | 'annual_summary'
    const [viewMode, setViewMode] = useState('monthly_sections');
    const [selectedSection, setSelectedSection] = useState('all'); // 'all' | 'charges_fixes' | 'charges_variables' | 'revenus' | 'encours_provisions'

    // Filter & display state for annual summary
    const [flowFilter, setFlowFilter] = useState('all'); // 'all' | 'expense' | 'revenue'
    const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' | 'vertical'
    const [sortBy, setSortBy] = useState('amount_desc'); // 'amount_desc' | 'amount_asc' | 'name_asc' | 'position'
    const [hideZeroAmount, setHideZeroAmount] = useState(true);
    const [showUncategorized, setShowUncategorized] = useState(true);
    const [includeInternalTransfers, setIncludeInternalTransfers] = useState(false);
    const [highlightedCategory, setHighlightedCategory] = useState(null);

    const handleYearChange = (newYear) => {
        router.get('/graphiques', { year: newYear }, { preserveState: true, preserveScroll: true });
    };

    // Filter helper for annual summary
    const sortAndFilterList = (rawList) => {
        let list = [...rawList];

        if (!includeInternalTransfers) {
            list = list.filter(item => !item.is_internal_transfer && !item.name.toLowerCase().includes('virement interne'));
        }

        if (!showUncategorized) {
            list = list.filter(item => !item.is_uncategorized);
        }

        if (hideZeroAmount) {
            list = list.filter(item => (item.display_amount || 0) > 0);
        }

        list.sort((a, b) => {
            if (sortBy === 'amount_desc') return (b.display_amount || 0) - (a.display_amount || 0);
            if (sortBy === 'amount_asc') return (a.display_amount || 0) - (b.display_amount || 0);
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'fr');
            if (sortBy === 'position') return (a.position || 0) - (b.position || 0);
            return 0;
        });

        return list;
    };

    const revenueCategories = useMemo(() => {
        const raw = categoriesStats.filter(c => c.type === 'revenue');
        const filtered = sortAndFilterList(raw);
        const total = filtered.reduce((acc, c) => acc + (c.display_amount || 0), 0);
        return filtered.map(c => ({
            ...c,
            calculatedPercentage: total > 0 ? (c.display_amount / total) * 100 : 0,
        }));
    }, [categoriesStats, includeInternalTransfers, showUncategorized, hideZeroAmount, sortBy]);

    const expenseCategories = useMemo(() => {
        const raw = categoriesStats.filter(c => c.type === 'expense');
        const filtered = sortAndFilterList(raw);
        const total = filtered.reduce((acc, c) => acc + (c.display_amount || 0), 0);
        return filtered.map(c => ({
            ...c,
            calculatedPercentage: total > 0 ? (c.display_amount / total) * 100 : 0,
        }));
    }, [categoriesStats, includeInternalTransfers, showUncategorized, hideZeroAmount, sortBy]);

    const totalRevenues = useMemo(() => {
        return revenueCategories.reduce((acc, c) => acc + (c.display_amount || 0), 0);
    }, [revenueCategories]);

    const totalExpenses = useMemo(() => {
        return expenseCategories.reduce((acc, c) => acc + (c.display_amount || 0), 0);
    }, [expenseCategories]);

    const netBalance = totalRevenues - totalExpenses;

    const topRevenueCategory = revenueCategories[0] || null;
    const topExpenseCategory = expenseCategories[0] || null;

    const maxMonths = 12;
    const monthlyAverageRevenue = totalRevenues / maxMonths;
    const monthlyAverageExpense = totalExpenses / maxMonths;

    const getCategoryColor = (item, index) => {
        if (item.is_uncategorized) return '#94a3b8';
        if (item.color && item.color.trim() !== '') return item.color;
        
        if (item.type === 'revenue') {
            const revenueColors = ['#10b981', '#059669', '#34d399', '#0d9488', '#14b8a6'];
            return revenueColors[index % revenueColors.length];
        }

        const defaultPalette = [
            '#6366f1', '#ec4899', '#3b82f6', '#f59e0b',
            '#8b5cf6', '#f97316', '#06b6d4', '#e11d48',
            '#84cc16', '#a855f7', '#0ea5e9', '#d946ef', '#64748b'
        ];
        return defaultPalette[index % defaultPalette.length];
    };

    const currentIndex = availableYears.indexOf(selectedYear);
    const prevYear = currentIndex < availableYears.length - 1 ? availableYears[currentIndex + 1] : null;
    const nextYear = currentIndex > 0 ? availableYears[currentIndex - 1] : null;

    return (
        <AppLayout>
            <Head title={`Graphiques Financiers - Année ${selectedYear}`} />

            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Top Header & Year Navigator */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-raised/60 p-4 sm:p-6 rounded-2xl border border-edge shadow-xl backdrop-blur-sm">
                    <div>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-accent-border flex items-center justify-center text-accent shadow-inner">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                                    Graphiques de Synthèse & Répartition
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-accent border border-accent-border">
                                        Année {selectedYear}
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-on-surface-muted mt-0.5">
                                    Évolution mensuelle par section (barres empilées) et histogramme de répartition annuelle
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Year Selector Control */}
                    <div className="flex items-center space-x-2 self-start md:self-auto bg-surface/80 p-1.5 rounded-xl border border-edge shadow-inner">
                        <button
                            onClick={() => prevYear && handleYearChange(prevYear)}
                            disabled={!prevYear}
                            className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                prevYear
                                    ? 'text-on-surface-secondary hover:text-white hover:bg-surface-elevated active:scale-95 cursor-pointer'
                                    : 'text-on-surface-faint cursor-not-allowed'
                            }`}
                            title={prevYear ? `Passer à ${prevYear}` : 'Aucune année antérieure'}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="relative">
                            <select
                                value={selectedYear}
                                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                                className="appearance-none bg-surface-raised text-white font-semibold text-sm pl-4 pr-9 py-2 rounded-lg border border-edge-strong/80 hover:border-accent-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
                            >
                                {availableYears.map((yr) => (
                                    <option key={yr} value={yr} className="bg-surface-raised text-on-surface">
                                        Année {yr}
                                    </option>
                                ))}
                            </select>
                            <Calendar className="w-4 h-4 text-accent absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <button
                            onClick={() => nextYear && handleYearChange(nextYear)}
                            disabled={!nextYear}
                            className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                nextYear
                                    ? 'text-on-surface-secondary hover:text-white hover:bg-surface-elevated active:scale-95 cursor-pointer'
                                    : 'text-on-surface-faint cursor-not-allowed'
                            }`}
                            title={nextYear ? `Passer à ${nextYear}` : 'Aucune année ultérieure'}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main View Mode Selector Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-raised/60 p-2.5 rounded-2xl border border-edge">
                    <div className="flex items-center space-x-1.5">
                        <button
                            onClick={() => setViewMode('monthly_sections')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
                                viewMode === 'monthly_sections'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                    : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated/50'
                            }`}
                        >
                            <BarChart2 className="w-4 h-4" />
                            <span>Graphiques mensuels par section (Charges fixes, Variables, Revenus)</span>
                        </button>

                        <button
                            onClick={() => setViewMode('annual_summary')}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
                                viewMode === 'annual_summary'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                    : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated/50'
                            }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span>Histogramme annuel par catégorie</span>
                        </button>
                    </div>

                    {/* Section filter when in monthly_sections view */}
                    {viewMode === 'monthly_sections' && (
                        <div className="flex items-center space-x-1 bg-surface/80 p-1 rounded-xl border border-edge text-xs">
                            <button
                                onClick={() => setSelectedSection('all')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                                    selectedSection === 'all' ? 'bg-surface-elevated text-white shadow-sm' : 'text-on-surface-muted hover:text-on-surface'
                                }`}
                            >
                                Tous
                            </button>
                            <button
                                onClick={() => setSelectedSection('charges_fixes')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                                    selectedSection === 'charges_fixes' ? 'bg-amber-600/30 text-amber-300 border border-warning-border' : 'text-on-surface-muted hover:text-on-surface'
                                }`}
                            >
                                Charges fixes
                            </button>
                            <button
                                onClick={() => setSelectedSection('charges_variables')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                                    selectedSection === 'charges_variables' ? 'bg-rose-600/30 text-negative-light border border-negative-border' : 'text-on-surface-muted hover:text-on-surface'
                                }`}
                            >
                                Charges variables
                            </button>
                            <button
                                onClick={() => setSelectedSection('revenus')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                                    selectedSection === 'revenus' ? 'bg-emerald-600/30 text-positive-light border border-positive-border' : 'text-on-surface-muted hover:text-on-surface'
                                }`}
                            >
                                Revenus
                            </button>
                        </div>
                    )}
                </div>

                {/* VIEW 1: MONTHLY STACKED SECTION CHARTS (LIKE ATTACHMENT) */}
                {viewMode === 'monthly_sections' && (
                    <div className="space-y-6">
                        {/* 1. Charges fixes */}
                        {(selectedSection === 'all' || selectedSection === 'charges_fixes') && monthlyCharts.charges_fixes && (
                            <MonthlyStackedSectionChart sectionData={monthlyCharts.charges_fixes} />
                        )}

                        {/* 2. Charges variables */}
                        {(selectedSection === 'all' || selectedSection === 'charges_variables') && monthlyCharts.charges_variables && (
                            <MonthlyStackedSectionChart sectionData={monthlyCharts.charges_variables} />
                        )}

                        {/* 3. Revenus */}
                        {(selectedSection === 'all' || selectedSection === 'revenus') && monthlyCharts.revenus && (
                            <MonthlyStackedSectionChart sectionData={monthlyCharts.revenus} />
                        )}
                    </div>
                )}

                {/* VIEW 2: ANNUAL CATEGORY SUMMARY HISTOGRAM */}
                {viewMode === 'annual_summary' && (
                    <>
                        {/* Summary KPIs Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-surface-raised/50 border border-edge/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-positive-border transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-positive/10 transition-all" />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Total Flux Positifs (Revenus)</span>
                                    <div className="p-2 rounded-xl bg-positive/10 border border-emerald-500/20 text-positive">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-2xl font-bold text-positive tracking-tight">
                                        {formatCurrency(totalRevenues)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-on-surface-muted mt-1 flex items-center gap-1.5">
                                    Moyenne : <span className="text-positive-light font-medium">{formatCurrency(monthlyAverageRevenue)}/mois</span>
                                </p>
                            </div>

                            <div className="bg-surface-raised/50 border border-edge/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-negative-border transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-negative/10 transition-all" />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Total Flux Négatifs (Dépenses)</span>
                                    <div className="p-2 rounded-xl bg-negative/10 border border-rose-500/20 text-negative">
                                        <TrendingDown className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-2xl font-bold text-negative tracking-tight">
                                        {formatCurrency(totalExpenses)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-on-surface-muted mt-1 flex items-center gap-1.5">
                                    Moyenne : <span className="text-negative-light font-medium">{formatCurrency(monthlyAverageExpense)}/mois</span>
                                </p>
                            </div>

                            <div className="bg-surface-raised/50 border border-edge/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-accent-border transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Solde Net Annuel</span>
                                    <div className={`p-2 rounded-xl border ${netBalance >= 0 ? 'bg-positive/10 border-emerald-500/20 text-positive' : 'bg-negative/10 border-rose-500/20 text-negative'}`}>
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className={`text-2xl font-bold tracking-tight ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                                        {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-on-surface-muted mt-1">
                                    Revenus totaux - Dépenses totales
                                </p>
                            </div>

                            <div className="bg-surface-raised/50 border border-edge/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Principaux Postes</span>
                                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-2 space-y-1 text-xs">
                                    <div className="flex items-center justify-between truncate">
                                        <span className="text-on-surface-muted truncate max-w-[110px]" title={topRevenueCategory?.name}>
                                            1er Rev : <span className="text-positive-light font-medium">{topRevenueCategory?.name || '-'}</span>
                                        </span>
                                        <span className="text-positive font-semibold">{formatCurrency(topRevenueCategory?.display_amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between truncate">
                                        <span className="text-on-surface-muted truncate max-w-[110px]" title={topExpenseCategory?.name}>
                                            1ère Dép : <span className="text-negative-light font-medium">{topExpenseCategory?.name || '-'}</span>
                                        </span>
                                        <span className="text-negative font-semibold">{formatCurrency(topExpenseCategory?.display_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Global Controls Toolbar */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-raised/60 p-4 rounded-2xl border border-edge shadow-md">
                            <div className="flex items-center bg-surface/90 p-1 rounded-xl border border-edge self-start">
                                <button
                                    onClick={() => setFlowFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                                        flowFilter === 'all'
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'text-on-surface-muted hover:text-on-surface'
                                    }`}
                                >
                                    <span>2 Zones (Revenus & Dépenses)</span>
                                </button>
                                <button
                                    onClick={() => setFlowFilter('revenue')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                                        flowFilter === 'revenue'
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                            : 'text-on-surface-muted hover:text-on-surface'
                                    }`}
                                >
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span>Revenus seuls ({formatCurrency(totalRevenues)})</span>
                                </button>
                                <button
                                    onClick={() => setFlowFilter('expense')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                                        flowFilter === 'expense'
                                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                                            : 'text-on-surface-muted hover:text-on-surface'
                                    }`}
                                >
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    <span>Dépenses seules ({formatCurrency(totalExpenses)})</span>
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                                <button
                                    onClick={() => setIncludeInternalTransfers(!includeInternalTransfers)}
                                    className={`px-2.5 py-1.5 rounded-xl font-medium flex items-center space-x-1.5 transition-all cursor-pointer border ${
                                        includeInternalTransfers
                                            ? 'bg-indigo-600/30 text-accent-light border-accent-border shadow-sm'
                                            : 'bg-surface/80 text-on-surface-muted border-edge hover:text-on-surface'
                                    }`}
                                    title="Inclure ou exclure les virements internes du graphique et des totaux"
                                >
                                    <ArrowLeftRight className={`w-3.5 h-3.5 ${includeInternalTransfers ? 'text-accent' : 'text-on-surface-faint'}`} />
                                    <span>Virements internes</span>
                                    <span className={`w-2 h-2 rounded-full ${includeInternalTransfers ? 'bg-accent' : 'bg-on-surface-faint'}`} />
                                </button>

                                <div className="flex items-center space-x-1.5 bg-surface/80 px-2.5 py-1.5 rounded-xl border border-edge">
                                    <ArrowUpDown className="w-3.5 h-3.5 text-on-surface-muted" />
                                    <span className="text-on-surface-muted font-medium">Tri :</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-transparent text-on-surface font-semibold focus:outline-none cursor-pointer pr-2"
                                    >
                                        <option value="amount_desc" className="bg-surface-raised text-on-surface">Montant (Décroissant)</option>
                                        <option value="amount_asc" className="bg-surface-raised text-on-surface">Montant (Croissant)</option>
                                        <option value="name_asc" className="bg-surface-raised text-on-surface">Nom (A-Z)</option>
                                        <option value="position" className="bg-surface-raised text-on-surface">Ordre configuré</option>
                                    </select>
                                </div>

                                <div className="flex items-center bg-surface/80 p-0.5 rounded-xl border border-edge">
                                    <button
                                        onClick={() => setOrientation('horizontal')}
                                        className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                                            orientation === 'horizontal'
                                                ? 'bg-indigo-600/30 text-accent-light border border-accent-border shadow-sm'
                                                : 'text-on-surface-muted hover:text-on-surface'
                                        }`}
                                        title="Disposition en barres horizontales"
                                    >
                                        <AlignHorizontalJustifyStart className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Horizontal</span>
                                    </button>
                                    <button
                                        onClick={() => setOrientation('vertical')}
                                        className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                                            orientation === 'vertical'
                                                ? 'bg-indigo-600/30 text-accent-light border border-accent-border shadow-sm'
                                                : 'text-on-surface-muted hover:text-on-surface'
                                        }`}
                                        title="Disposition en colonnes verticales"
                                    >
                                        <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Vertical</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => setHideZeroAmount(!hideZeroAmount)}
                                    className={`px-2.5 py-1.5 rounded-xl font-medium flex items-center space-x-1.5 transition-all cursor-pointer border ${
                                        hideZeroAmount
                                            ? 'bg-surface-elevated text-accent-light border-accent-border'
                                            : 'bg-surface/80 text-on-surface-muted border-edge hover:text-on-surface'
                                    }`}
                                    title="Masquer les catégories sans montant pour l'année"
                                >
                                    {hideZeroAmount ? <EyeOff className="w-3.5 h-3.5 text-accent" /> : <Eye className="w-3.5 h-3.5" />}
                                    <span>Masquer 0 €</span>
                                </button>

                                <button
                                    onClick={() => setShowUncategorized(!showUncategorized)}
                                    className={`px-2.5 py-1.5 rounded-xl font-medium flex items-center space-x-1.5 transition-all cursor-pointer border ${
                                        showUncategorized
                                            ? 'bg-surface-elevated text-accent-light border-accent-border'
                                            : 'bg-surface/80 text-on-surface-muted border-edge hover:text-on-surface'
                                    }`}
                                    title="Afficher ou masquer les flux non catégorisés"
                                >
                                    <span>Non catégorisé</span>
                                </button>
                            </div>
                        </div>

                        {/* Split Chart Area */}
                        {flowFilter === 'all' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                <CategoryBarChart
                                    title="Flux Positifs (Revenus)"
                                    type="revenue"
                                    items={revenueCategories}
                                    totalAmount={totalRevenues}
                                    orientation={orientation}
                                    highlightedId={highlightedCategory}
                                    onHover={setHighlightedCategory}
                                />

                                <CategoryBarChart
                                    title="Flux Négatifs (Dépenses)"
                                    type="expense"
                                    items={expenseCategories}
                                    totalAmount={totalExpenses}
                                    orientation={orientation}
                                    highlightedId={highlightedCategory}
                                    onHover={setHighlightedCategory}
                                />
                            </div>
                        )}

                        {flowFilter === 'revenue' && (
                            <div className="w-full">
                                <CategoryBarChart
                                    title="Flux Positifs (Revenus)"
                                    type="revenue"
                                    items={revenueCategories}
                                    totalAmount={totalRevenues}
                                    orientation={orientation}
                                    highlightedId={highlightedCategory}
                                    onHover={setHighlightedCategory}
                                />
                            </div>
                        )}

                        {flowFilter === 'expense' && (
                            <div className="w-full">
                                <CategoryBarChart
                                    title="Flux Négatifs (Dépenses)"
                                    type="expense"
                                    items={expenseCategories}
                                    totalAmount={totalExpenses}
                                    orientation={orientation}
                                    highlightedId={highlightedCategory}
                                    onHover={setHighlightedCategory}
                                />
                            </div>
                        )}

                        {/* Detailed Tables Split Section */}
                        <div className="space-y-6">
                            {(flowFilter === 'all' || flowFilter === 'revenue') && (
                                <div className="bg-surface-raised/70 border border-emerald-500/20 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm overflow-hidden">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-edge">
                                        <div className="flex items-center space-x-2.5">
                                            <div className="p-1.5 rounded-lg bg-positive/10 text-positive border border-emerald-500/20">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <h2 className="text-base font-bold text-white">
                                                Détail des Flux Positifs (Revenus)
                                            </h2>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-positive/10 text-positive border border-emerald-500/20 font-medium">
                                                {revenueCategories.length} poste{revenueCategories.length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <span className="text-xs text-on-surface-muted">
                                            Total Revenus : <strong className="text-positive text-sm">{formatCurrency(totalRevenues)}</strong>
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-edge">
                                        <table className="w-full text-left text-xs sm:text-sm text-on-surface-secondary">
                                            <thead className="bg-surface/80 text-on-surface-muted font-semibold border-b border-edge uppercase tracking-wider text-[11px]">
                                                <tr>
                                                    <th className="py-3 px-4 w-12 text-center">#</th>
                                                    <th className="py-3 px-4">Poste de Revenu</th>
                                                    <th className="py-3 px-4 text-right">Montant annuel</th>
                                                    <th className="py-3 px-4 text-left w-48 hidden sm:table-cell">Part des revenus</th>
                                                    <th className="py-3 px-4 text-center w-28">Opérations</th>
                                                    <th className="py-3 px-4 text-right hidden md:table-cell">Moyenne / mois</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-edge/60 bg-surface-raised/40">
                                                {revenueCategories.map((cat, idx) => {
                                                    const color = getCategoryColor(cat, idx);
                                                    const isHighlighted = highlightedCategory === cat.id;
                                                    const monthlyAvg = (cat.display_amount || 0) / 12;

                                                    return (
                                                        <tr
                                                            key={cat.id}
                                                            onMouseEnter={() => setHighlightedCategory(cat.id)}
                                                            onMouseLeave={() => setHighlightedCategory(null)}
                                                            className={`transition-colors cursor-default ${
                                                                isHighlighted
                                                                    ? 'bg-emerald-950/30 text-white'
                                                                    : 'hover:bg-surface-elevated/40'
                                                            }`}
                                                        >
                                                            <td className="py-3 px-4 text-center text-on-surface-muted font-medium">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="py-3 px-4 font-medium">
                                                                <div className="flex items-center space-x-2.5">
                                                                    <span
                                                                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                    <span className="text-on-surface font-semibold">
                                                                        {cat.name}
                                                                    </span>
                                                                    {cat.is_internal_transfer && (
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/20 text-accent-light border border-accent-border">
                                                                            Virement interne
                                                                        </span>
                                                                    )}
                                                                    {cat.is_uncategorized && (
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-elevated text-on-surface-muted border border-edge-strong">
                                                                            Non affecté
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-bold text-positive whitespace-nowrap">
                                                                {formatCurrency(cat.display_amount)}
                                                            </td>
                                                            <td className="py-3 px-4 hidden sm:table-cell">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="flex-1 bg-surface-elevated rounded-full h-2 overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded-full transition-all duration-500"
                                                                            style={{
                                                                                width: `${Math.min(100, Math.max(0, cat.calculatedPercentage || 0))}%`,
                                                                                backgroundColor: color,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-positive-light w-12 text-right">
                                                                        {(cat.calculatedPercentage || 0).toFixed(1)} %
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-on-surface-muted">
                                                                <span className="px-2 py-0.5 rounded-full bg-surface-elevated/80 font-medium text-xs text-on-surface-secondary">
                                                                    {cat.operations_count || 0}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-on-surface-secondary hidden md:table-cell whitespace-nowrap">
                                                                {formatCurrency(monthlyAvg)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {revenueCategories.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="py-6 text-center text-on-surface-faint">
                                                            Aucun revenu enregistré pour cette sélection.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {(flowFilter === 'all' || flowFilter === 'expense') && (
                                <div className="bg-surface-raised/70 border border-rose-500/20 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm overflow-hidden">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-edge">
                                        <div className="flex items-center space-x-2.5">
                                            <div className="p-1.5 rounded-lg bg-negative/10 text-negative border border-rose-500/20">
                                                <TrendingDown className="w-4 h-4" />
                                            </div>
                                            <h2 className="text-base font-bold text-white">
                                                Détail des Flux Négatifs (Dépenses)
                                            </h2>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-negative/10 text-negative border border-rose-500/20 font-medium">
                                                {expenseCategories.length} catégorie{expenseCategories.length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <span className="text-xs text-on-surface-muted">
                                            Total Dépenses : <strong className="text-negative text-sm">{formatCurrency(totalExpenses)}</strong>
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-edge">
                                        <table className="w-full text-left text-xs sm:text-sm text-on-surface-secondary">
                                            <thead className="bg-surface/80 text-on-surface-muted font-semibold border-b border-edge uppercase tracking-wider text-[11px]">
                                                <tr>
                                                    <th className="py-3 px-4 w-12 text-center">#</th>
                                                    <th className="py-3 px-4">Type de Dépense</th>
                                                    <th className="py-3 px-4 text-right">Montant annuel</th>
                                                    <th className="py-3 px-4 text-left w-48 hidden sm:table-cell">Part des dépenses</th>
                                                    <th className="py-3 px-4 text-center w-28">Opérations</th>
                                                    <th className="py-3 px-4 text-right hidden md:table-cell">Moyenne / mois</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-edge/60 bg-surface-raised/40">
                                                {expenseCategories.map((cat, idx) => {
                                                    const color = getCategoryColor(cat, idx);
                                                    const isHighlighted = highlightedCategory === cat.id;
                                                    const monthlyAvg = (cat.display_amount || 0) / 12;

                                                    return (
                                                        <tr
                                                            key={cat.id}
                                                            onMouseEnter={() => setHighlightedCategory(cat.id)}
                                                            onMouseLeave={() => setHighlightedCategory(null)}
                                                            className={`transition-colors cursor-default ${
                                                                isHighlighted
                                                                    ? 'bg-rose-950/30 text-white'
                                                                    : 'hover:bg-surface-elevated/40'
                                                            }`}
                                                        >
                                                            <td className="py-3 px-4 text-center text-on-surface-muted font-medium">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="py-3 px-4 font-medium">
                                                                <div className="flex items-center space-x-2.5">
                                                                    <span
                                                                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                    <span className="text-on-surface font-semibold">
                                                                        {cat.name}
                                                                    </span>
                                                                    {cat.is_internal_transfer && (
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/20 text-accent-light border border-accent-border">
                                                                            Virement interne
                                                                        </span>
                                                                    )}
                                                                    {cat.is_uncategorized && (
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-elevated text-on-surface-muted border border-edge-strong">
                                                                            Non affecté
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
                                                                {formatCurrency(cat.display_amount)}
                                                            </td>
                                                            <td className="py-3 px-4 hidden sm:table-cell">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="flex-1 bg-surface-elevated rounded-full h-2 overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded-full transition-all duration-500"
                                                                            style={{
                                                                                width: `${Math.min(100, Math.max(0, cat.calculatedPercentage || 0))}%`,
                                                                                backgroundColor: color,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-negative-light w-12 text-right">
                                                                        {(cat.calculatedPercentage || 0).toFixed(1)} %
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-on-surface-muted">
                                                                <span className="px-2 py-0.5 rounded-full bg-surface-elevated/80 font-medium text-xs text-on-surface-secondary">
                                                                    {cat.operations_count || 0}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-on-surface-secondary hidden md:table-cell whitespace-nowrap">
                                                                {formatCurrency(monthlyAvg)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {expenseCategories.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="py-6 text-center text-on-surface-faint">
                                                            Aucune dépense enregistrée pour cette sélection.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
