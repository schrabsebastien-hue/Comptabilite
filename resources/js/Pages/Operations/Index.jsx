import React, { useState, useMemo, useRef, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import ExpenseTypeSelect from '../../Components/ExpenseTypeSelect';
import QuickFiltersSidebar from '../../Components/QuickFiltersSidebar';
import {
    Search,
    Filter,
    FileSpreadsheet,
    Trash2,
    TrendingDown,
    TrendingUp,
    Wallet,
    Calendar,
    Check,
    X,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    CheckSquare,
    Square,
    ChevronRight,
    ChevronDown,
    Layers,
    Table as TableIcon,
    ChevronsUpDown,
    ChevronsDownUp,
    ArrowDownWideNarrow
} from 'lucide-react';

export default function Index({ operations, expenseTypes, filters, stats }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [editingCell, setEditingCell] = useState(null); // { id, field }
    const [cellValues, setCellValues] = useState({});

    // View Mode: 'table' (flat table) or 'grouped' (Google Sheets / accordion grouping)
    const [viewMode, setViewMode] = useState('grouped'); // default to grouped as requested or user choice
    const [collapsedGroups, setCollapsedGroups] = useState([]);
    const [groupSortKey, setGroupSortKey] = useState('expense_desc'); // 'name_asc' | 'expense_desc' | 'count_desc'

    // Active column filter dropdown state
    const [openFilterCol, setOpenFilterCol] = useState(null); // 'date' | 'expense_type' | 'label' | 'amount' | 'comment' | null
    const popoverRef = useRef(null);

    // Global Search & Column Filter States
    const [globalSearch, setGlobalSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [selectedMonth, setSelectedMonth] = useState(null); // 'YYYY-MM' | null
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Individual Column Filters State
    const [columnFilters, setColumnFilters] = useState({
        dateSearch: '',
        selectedDates: [],
        expenseTypeSearch: '',
        selectedExpenseTypeIds: [], // array of IDs (string/number), including 'none'
        labelSearch: '',
        selectedLabels: [],
        amountType: 'all', // 'all' | 'credit' | 'debit'
        minAmount: '',
        maxAmount: '',
        commentSearch: '',
        selectedComments: [],
    });

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setOpenFilterCol(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

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

    // Format YYYY-MM to French month label safely
    const formatYearMonthLabel = (yearMonthStr) => {
        if (!yearMonthStr) return '';
        const [year, month] = yearMonthStr.split('-');
        const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 15);
        const label = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    };

    // Unique values lists for Excel-style checkboxes
    const uniqueDates = useMemo(() => {
        const set = new Set(operations.map((op) => op.date).filter(Boolean));
        return Array.from(set).sort().reverse();
    }, [operations]);

    const uniqueLabels = useMemo(() => {
        const set = new Set(operations.map((op) => op.label).filter(Boolean));
        return Array.from(set).sort();
    }, [operations]);

    const uniqueComments = useMemo(() => {
        const set = new Set(operations.map((op) => op.comment).filter(Boolean));
        return Array.from(set).sort();
    }, [operations]);

    // Items filtered INSIDE each Excel Popover list based on the popover search input
    const filteredExpenseTypesInPopover = useMemo(() => {
        if (!columnFilters.expenseTypeSearch.trim()) return expenseTypes;
        const q = columnFilters.expenseTypeSearch.toLowerCase();
        return expenseTypes.filter((t) => t.name.toLowerCase().includes(q));
    }, [expenseTypes, columnFilters.expenseTypeSearch]);

    const showNoneCategoryInPopover = useMemo(() => {
        if (!columnFilters.expenseTypeSearch.trim()) return true;
        const q = columnFilters.expenseTypeSearch.toLowerCase();
        return 'non catégorisé'.includes(q) || 'non categorise'.includes(q);
    }, [columnFilters.expenseTypeSearch]);

    const filteredLabelsInPopover = useMemo(() => {
        if (!columnFilters.labelSearch.trim()) return uniqueLabels;
        const q = columnFilters.labelSearch.toLowerCase();
        return uniqueLabels.filter((lbl) => lbl.toLowerCase().includes(q));
    }, [uniqueLabels, columnFilters.labelSearch]);

    const filteredCommentsInPopover = useMemo(() => {
        if (!columnFilters.commentSearch.trim()) return uniqueComments;
        const q = columnFilters.commentSearch.toLowerCase();
        return uniqueComments.filter((cmt) => cmt.toLowerCase().includes(q));
    }, [uniqueComments, columnFilters.commentSearch]);

    const filteredDatesInPopover = useMemo(() => {
        if (!columnFilters.dateSearch.trim()) return uniqueDates;
        const q = columnFilters.dateSearch.toLowerCase();
        return uniqueDates.filter((d) => d.includes(q) || formatDate(d).toLowerCase().includes(q));
    }, [uniqueDates, columnFilters.dateSearch]);

    // Filter & Sort Operations in Main Table (based on selected checkboxes and global search)
    const filteredOperations = useMemo(() => {
        return operations.filter((op) => {
            // Month Filter (Visual shortcut from left sidebar YYYY-MM)
            if (selectedMonth) {
                const opMonth = getYearMonthKey(op.date);
                if (opMonth !== selectedMonth) return false;
            }

            // Global search
            if (globalSearch.trim()) {
                const query = globalSearch.toLowerCase();
                const matchLabel = op.label?.toLowerCase().includes(query);
                const matchComment = op.comment?.toLowerCase().includes(query);
                const matchType = op.expense_type?.name?.toLowerCase().includes(query);
                if (!matchLabel && !matchComment && !matchType) return false;
            }

            // Date Checkbox Filter
            if (columnFilters.selectedDates.length > 0) {
                if (!columnFilters.selectedDates.includes(op.date)) return false;
            }

            // Expense Type Checkbox Filter
            if (columnFilters.selectedExpenseTypeIds.length > 0) {
                const opTypeId = op.expense_type_id ? String(op.expense_type_id) : 'none';
                if (!columnFilters.selectedExpenseTypeIds.includes(opTypeId)) return false;
            }

            // Label Checkbox Filter
            if (columnFilters.selectedLabels.length > 0) {
                if (!columnFilters.selectedLabels.includes(op.label)) return false;
            }

            // Amount Filter
            const amt = parseFloat(op.amount);
            if (columnFilters.amountType === 'credit' && amt < 0) return false;
            if (columnFilters.amountType === 'debit' && amt >= 0) return false;
            if (columnFilters.minAmount !== '' && amt < parseFloat(columnFilters.minAmount)) return false;
            if (columnFilters.maxAmount !== '' && amt > parseFloat(columnFilters.maxAmount)) return false;

            // Comment Checkbox Filter
            if (columnFilters.selectedComments.length > 0) {
                const commentVal = op.comment || '__EMPTY__';
                if (!columnFilters.selectedComments.includes(commentVal)) return false;
            }

            return true;
        }).sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (sortConfig.key === 'expense_type') {
                aVal = a.expense_type?.name || '';
                bVal = b.expense_type?.name || '';
            } else if (sortConfig.key === 'amount') {
                aVal = parseFloat(a.amount);
                bVal = parseFloat(b.amount);
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [operations, selectedMonth, globalSearch, columnFilters, sortConfig]);

    // Grouped Operations by Expense Type (Google Sheets Hierarchy)
    const groupedOperations = useMemo(() => {
        const groupsMap = new Map();

        // 1. Group operations by expense_type_id
        filteredOperations.forEach((op) => {
            const key = op.expense_type_id ? String(op.expense_type_id) : 'none';
            if (!groupsMap.has(key)) {
                let typeObj = null;
                if (key !== 'none') {
                    typeObj = expenseTypes.find((t) => String(t.id) === key);
                }
                groupsMap.set(key, {
                    key,
                    expenseType: typeObj || {
                        id: 'none',
                        name: 'Non catégorisé',
                        color: '#94a3b8',
                    },
                    items: [],
                    totalCredits: 0,
                    totalDebits: 0,
                    netBalance: 0,
                });
            }

            const group = groupsMap.get(key);
            group.items.push(op);
            const amt = parseFloat(op.amount) || 0;
            if (amt > 0) {
                group.totalCredits += amt;
            } else {
                group.totalDebits += amt;
            }
            group.netBalance += amt;
        });

        const groups = Array.from(groupsMap.values());

        // 2. Sort groups according to selected sort criteria
        groups.sort((a, b) => {
            if (groupSortKey === 'name_asc') {
                if (a.key === 'none') return 1;
                if (b.key === 'none') return -1;
                return a.expenseType.name.localeCompare(b.expenseType.name, 'fr');
            } else if (groupSortKey === 'expense_desc') {
                // Larger debit in absolute value first (most expensive categories first)
                return Math.abs(a.totalDebits) > Math.abs(b.totalDebits) ? -1 : 1;
            } else if (groupSortKey === 'count_desc') {
                return b.items.length - a.items.length;
            }
            return 0;
        });

        return groups;
    }, [filteredOperations, expenseTypes, groupSortKey]);

    // Accordion actions for Google Sheets grouped view
    const toggleGroupCollapse = (key) => {
        setCollapsedGroups((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const expandAllGroups = () => {
        setCollapsedGroups([]);
    };

    const collapseAllGroups = () => {
        setCollapsedGroups(groupedOperations.map((g) => g.key));
    };

    const handleSelectGroup = (items) => {
        const itemIds = items.map((i) => i.id);
        const allSelected = itemIds.every((id) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !itemIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...itemIds])));
        }
    };

    // Financial KPI Summary for Filtered Operations
    const currentStats = useMemo(() => {
        let totalCredits = 0;
        let totalDebits = 0;
        filteredOperations.forEach((op) => {
            const amt = parseFloat(op.amount);
            if (amt > 0) totalCredits += amt;
            else totalDebits += amt;
        });
        return {
            totalCredits,
            totalDebits,
            netBalance: totalCredits + totalDebits,
            totalCount: filteredOperations.length,
        };
    }, [filteredOperations]);

    // Check if any filter is active for a given column
    const isColumnFiltered = (colKey) => {
        if (colKey === 'date') return columnFilters.selectedDates.length > 0;
        if (colKey === 'expense_type') return columnFilters.selectedExpenseTypeIds.length > 0;
        if (colKey === 'label') return columnFilters.selectedLabels.length > 0;
        if (colKey === 'amount') return columnFilters.amountType !== 'all' || columnFilters.minAmount !== '' || columnFilters.maxAmount !== '';
        if (colKey === 'comment') return columnFilters.selectedComments.length > 0;
        return false;
    };

    const hasAnyActiveFilters = useMemo(() => {
        return (
            selectedMonth !== null ||
            globalSearch.trim() !== '' ||
            columnFilters.selectedDates.length > 0 ||
            columnFilters.selectedExpenseTypeIds.length > 0 ||
            columnFilters.selectedLabels.length > 0 ||
            columnFilters.amountType !== 'all' ||
            columnFilters.minAmount !== '' ||
            columnFilters.maxAmount !== '' ||
            columnFilters.selectedComments.length > 0
        );
    }, [selectedMonth, globalSearch, columnFilters]);

    const handleClearAllFilters = () => {
        setSelectedMonth(null);
        setGlobalSearch('');
        setColumnFilters({
            dateSearch: '',
            selectedDates: [],
            expenseTypeSearch: '',
            selectedExpenseTypeIds: [],
            labelSearch: '',
            selectedLabels: [],
            amountType: 'all',
            minAmount: '',
            maxAmount: '',
            commentSearch: '',
            selectedComments: [],
        });
        setSortConfig({ key: 'date', direction: 'desc' });
        setOpenFilterCol(null);
    };

    // Toggle Sort Order
    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    // Inline field updates
    const handleExpenseTypeChange = (operationId, newExpenseTypeId) => {
        router.patch(
            `/operations/${operationId}`,
            { expense_type_id: newExpenseTypeId || null },
            { preserveScroll: true }
        );
    };

    const handleSaveCell = (operationId, field) => {
        const val = cellValues[`${operationId}-${field}`];
        if (val === undefined) {
            setEditingCell(null);
            return;
        }

        router.patch(
            `/operations/${operationId}`,
            { [field]: val },
            {
                preserveScroll: true,
                onSuccess: () => setEditingCell(null),
            }
        );
    };

    const handleCellKeyDown = (e, operationId, field) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveCell(operationId, field);
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    // Bulk actions
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredOperations.map((op) => op.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Voulez-vous vraiment supprimer les ${selectedIds.length} opération(s) sélectionnée(s) ?`)) {
            router.post(
                '/operations/bulk-delete',
                { ids: selectedIds },
                {
                    preserveScroll: true,
                    onSuccess: () => setSelectedIds([]),
                }
            );
        }
    };

    const handleDeleteOne = (id) => {
        if (confirm('Voulez-vous supprimer cette opération ?')) {
            router.delete(`/operations/${id}`, { preserveScroll: true });
        }
    };

    const formatAmount = (val) => {
        const num = parseFloat(val);
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
    };

    // Single Operation Row Renderer (used in flat table & grouped accordion)
    const renderOperationRow = (op, isGrouped = false, groupColor = null) => {
        const isDebit = parseFloat(op.amount) < 0;
        const isSelected = selectedIds.includes(op.id);

        return (
            <tr
                key={op.id}
                className={`hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-indigo-500/5' : isGrouped ? 'bg-slate-900/30' : ''
                }`}
                style={
                    isGrouped && groupColor
                        ? { borderLeft: `3px solid ${groupColor}80` }
                        : undefined
                }
            >
                {/* Checkbox */}
                <td className={`p-4 text-center border-r border-slate-800/40 ${isGrouped ? 'pl-6' : ''}`}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(op.id)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </td>

                {/* Date */}
                <td className="p-4 text-slate-300 font-mono text-xs whitespace-nowrap border-r border-slate-800/40">
                    {formatDate(op.date)}
                </td>

                {/* Type de dépense (Custom Selectable Component) */}
                <td className="p-4 border-r border-slate-800/40 min-w-[210px]">
                    <ExpenseTypeSelect
                        value={op.expense_type_id}
                        expenseTypes={expenseTypes}
                        onChange={(newTypeId) => handleExpenseTypeChange(op.id, newTypeId)}
                    />
                </td>

                {/* Intitulé (Editable) */}
                <td className="p-4 border-r border-slate-800/40">
                    {editingCell?.id === op.id && editingCell?.field === 'label' ? (
                        <div className="flex items-center space-x-1">
                            <input
                                type="text"
                                autoFocus
                                value={
                                    cellValues[`${op.id}-label`] !== undefined
                                        ? cellValues[`${op.id}-label`]
                                        : op.label
                                }
                                onChange={(e) =>
                                    setCellValues({ ...cellValues, [`${op.id}-label`]: e.target.value })
                                }
                                onKeyDown={(e) => handleCellKeyDown(e, op.id, 'label')}
                                onBlur={() => handleSaveCell(op.id, 'label')}
                                className="w-full bg-slate-950 border border-indigo-500 text-white rounded px-2 py-1 text-xs focus:outline-none"
                            />
                        </div>
                    ) : (
                        <div
                            onClick={() => {
                                setEditingCell({ id: op.id, field: 'label' });
                                setCellValues({ ...cellValues, [`${op.id}-label`]: op.label });
                            }}
                            className="text-slate-200 cursor-pointer hover:bg-slate-800/80 px-2 py-1 rounded transition flex items-center justify-between group"
                            title="Cliquer pour modifier"
                        >
                            <span className="truncate">{op.label}</span>
                        </div>
                    )}
                </td>

                {/* Montant */}
                <td className="p-4 text-right whitespace-nowrap border-r border-slate-800/40">
                    <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                            isDebit
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                    >
                        {!isDebit && '+'}
                        {formatAmount(op.amount)}
                    </span>
                </td>

                {/* Commentaires (Editable) */}
                <td className="p-4 border-r border-slate-800/40">
                    {editingCell?.id === op.id && editingCell?.field === 'comment' ? (
                        <div className="flex items-center space-x-1">
                            <input
                                type="text"
                                autoFocus
                                value={
                                    cellValues[`${op.id}-comment`] !== undefined
                                        ? cellValues[`${op.id}-comment`]
                                        : op.comment || ''
                                }
                                onChange={(e) =>
                                    setCellValues({ ...cellValues, [`${op.id}-comment`]: e.target.value })
                                }
                                onKeyDown={(e) => handleCellKeyDown(e, op.id, 'comment')}
                                onBlur={() => handleSaveCell(op.id, 'comment')}
                                className="w-full bg-slate-950 border border-indigo-500 text-white rounded px-2 py-1 text-xs focus:outline-none"
                            />
                        </div>
                    ) : (
                        <div
                            onClick={() => {
                                setEditingCell({ id: op.id, field: 'comment' });
                                setCellValues({ ...cellValues, [`${op.id}-comment`]: op.comment || '' });
                            }}
                            className="text-slate-400 cursor-pointer hover:bg-slate-800/80 px-2 py-1 rounded transition flex items-center justify-between text-xs"
                            title="Cliquer pour modifier"
                        >
                            <span className="truncate">{op.comment || <span className="italic text-slate-600">Aucun commentaire</span>}</span>
                        </div>
                    )}
                </td>

                {/* Action */}
                <td className="p-4 text-center">
                    <button
                        onClick={() => handleDeleteOne(op.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        title="Supprimer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </td>
            </tr>
        );
    };

    // Excel Checkbox helper
    const toggleArrayItem = (arr, item) => {
        if (arr.includes(item)) return arr.filter((i) => i !== item);
        return [...arr, item];
    };

    const formattedSelectedMonthName = useMemo(() => {
        if (!selectedMonth) return null;
        return formatYearMonthLabel(selectedMonth);
    }, [selectedMonth]);

    return (
        <AppLayout title="Liste des opérations">
            <div className="space-y-6">
                {/* Header Title Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3 flex-wrap gap-y-2">
                            <span>Liste des opérations</span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-medium flex items-center space-x-1.5">
                                <span>{currentStats.totalCount} / {stats.totalCount} affichée(s)</span>
                                {formattedSelectedMonthName && (
                                    <span className="inline-flex items-center space-x-1 ml-1 px-2 py-0.5 rounded-md bg-indigo-600 text-white font-normal shadow-sm">
                                        <span>Mois : {formattedSelectedMonthName}</span>
                                        <button onClick={() => setSelectedMonth(null)} className="hover:text-slate-200 ml-0.5 cursor-pointer">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                            </span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Filtrez les colonnes façon Excel, triez et catégorisez vos opérations bancaires.
                        </p>
                    </div>
                </div>

                {/* Main Content Layout with Left Sidebar */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Sidebar Panel: Quick Filters & Shortcuts */}
                    <QuickFiltersSidebar
                        operations={operations}
                        selectedMonth={selectedMonth}
                        onSelectMonth={setSelectedMonth}
                        expenseTypes={expenseTypes}
                        selectedExpenseTypeIds={columnFilters.selectedExpenseTypeIds}
                        onSelectExpenseTypeId={(id) => {
                            if (id === null) {
                                setColumnFilters((prev) => ({ ...prev, selectedExpenseTypeIds: [] }));
                            } else {
                                setColumnFilters((prev) => ({
                                    ...prev,
                                    selectedExpenseTypeIds: prev.selectedExpenseTypeIds.includes(id)
                                        ? prev.selectedExpenseTypeIds.filter((item) => item !== id)
                                        : [...prev.selectedExpenseTypeIds, id],
                                }));
                            }
                        }}
                        amountType={columnFilters.amountType}
                        onSelectAmountType={(type) =>
                            setColumnFilters((prev) => ({ ...prev, amountType: type }))
                        }
                        hasActiveFilters={hasAnyActiveFilters}
                        onClearAllFilters={handleClearAllFilters}
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                    />

                    {/* Right Main Content Section */}
                    <div className="flex-1 space-y-6 min-w-0">

                {/* Financial Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Total Credits */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-between relative overflow-hidden">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Total Recettes (Crédit)
                            </span>
                            <div className="text-2xl font-extrabold text-emerald-400">
                                +{formatAmount(currentStats.totalCredits)}
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                    </div>

                    {/* Total Debits */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-between relative overflow-hidden">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Total Dépenses (Débit)
                            </span>
                            <div className="text-2xl font-extrabold text-rose-400">
                                {formatAmount(currentStats.totalDebits)}
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                    </div>

                    {/* Net Balance */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-between relative overflow-hidden sm:col-span-2 lg:col-span-1">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Solde Net Filtré
                            </span>
                            <div className={`text-2xl font-extrabold ${currentStats.netBalance >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                                {formatAmount(currentStats.netBalance)}
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                    </div>
                </div>

                {/* Global Search & Active Filters Bar */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col xl:flex-row items-center justify-between gap-4">
                    {/* Global search */}
                    <div className="relative w-full xl:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                            type="text"
                            placeholder="Recherche globale (intitulé, commentaire, type)..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* View Mode Switcher & Group Controls */}
                    <div className="flex items-center flex-wrap gap-2.5 w-full xl:w-auto justify-between xl:justify-end text-xs">
                        {/* Toggle Mode: Grouped (Google Sheets) vs Table */}
                        <div className="inline-flex items-center p-1 bg-slate-950/90 rounded-xl border border-slate-800 shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('grouped')}
                                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                                    viewMode === 'grouped'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                                title="Afficher les opérations regroupées par type de dépense (style Google Sheets)"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Groupé par Type</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                                title="Affichage tableau standard à plat"
                            >
                                <TableIcon className="w-3.5 h-3.5" />
                                <span>Liste à plat</span>
                            </button>
                        </div>

                        {/* Group Controls (shown only when viewMode === 'grouped') */}
                        {viewMode === 'grouped' && (
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                                <button
                                    type="button"
                                    onClick={expandAllGroups}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/80 cursor-pointer text-xs font-medium"
                                    title="Déplier toutes les catégories"
                                >
                                    <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Tout déplier</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={collapseAllGroups}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/80 cursor-pointer text-xs font-medium"
                                    title="Replier toutes les catégories"
                                >
                                    <ChevronsDownUp className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Tout replier</span>
                                </button>

                                {/* Sort groups select */}
                                <div className="relative">
                                    <select
                                        value={groupSortKey}
                                        onChange={(e) => setGroupSortKey(e.target.value)}
                                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                                        title="Trier les catégories"
                                    >
                                        <option value="expense_desc">Dépenses (décroissant)</option>
                                        <option value="name_asc">Nom (A → Z)</option>
                                        <option value="count_desc">Nombre d'opérations</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Bulk Delete Button */}
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition cursor-pointer font-medium"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer ({selectedIds.length})</span>
                            </button>
                        )}

                        {/* Clear filters button */}
                        {hasAnyActiveFilters && (
                            <button
                                onClick={handleClearAllFilters}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer font-medium border border-slate-700"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Effacer filtres</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Excel & Google Sheets Datatable */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm relative">
                    {filteredOperations.length === 0 ? (
                        <div className="py-16 px-4 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                                <FileSpreadsheet className="w-8 h-8" />
                            </div>
                            <div className="max-w-md mx-auto space-y-2">
                                <h3 className="text-base font-semibold text-white">Aucune opération trouvée</h3>
                                <p className="text-xs text-slate-400">
                                    {hasAnyActiveFilters
                                        ? 'Aucun élément ne correspond à vos filtres de colonnes ou recherche.'
                                        : 'Importez votre premier fichier .xls bancaire pour remplir le tableau des opérations.'}
                                </p>
                                {hasAnyActiveFilters && (
                                    <button
                                        onClick={handleClearAllFilters}
                                        className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Réinitialiser les filtres</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-950/90 border-b border-slate-800 text-xs font-semibold tracking-wider text-slate-300 select-none sticky top-0 z-20 backdrop-blur">
                                    <tr>
                                        {/* Checkbox Select All */}
                                        <th className="p-4 w-10 text-center border-r border-slate-800/60">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={selectedIds.length === filteredOperations.length && filteredOperations.length > 0}
                                                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </th>

                                        {/* Date Column Header */}
                                        <th className="p-3 w-36 border-r border-slate-800/60 relative">
                                            <div className="flex items-center justify-between">
                                                <span onClick={() => handleSort('date')} className="cursor-pointer hover:text-white flex items-center space-x-1">
                                                    <span>Date</span>
                                                    {sortConfig.key === 'date' && (
                                                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                                                    )}
                                                </span>

                                                <button
                                                    onClick={() => setOpenFilterCol(openFilterCol === 'date' ? null : 'date')}
                                                    className={`p-1 rounded-md transition cursor-pointer ${
                                                        isColumnFiltered('date')
                                                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }`}
                                                    title="Filtrer la colonne Date"
                                                >
                                                    <Filter className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Date Excel Filter Popover */}
                                            {openFilterCol === 'date' && (
                                                <div ref={popoverRef} className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs normal-case font-normal space-y-3">
                                                    <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2 flex justify-between items-center">
                                                        <span>Filtre Excel: Date</span>
                                                        <button onClick={() => setOpenFilterCol(null)} className="text-slate-400 hover:text-white">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <button
                                                            onClick={() => handleSort('date')}
                                                            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                                                        >
                                                            <span>Trier du plus récent au plus ancien</span>
                                                            <ArrowDown className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSortConfig({ key: 'date', direction: 'asc' });
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                                                        >
                                                            <span>Trier du plus ancien au plus récent</span>
                                                            <ArrowUp className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Filter input inside Date popover */}
                                                    <div className="border-t border-slate-800 pt-2 space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Rechercher une date..."
                                                            value={columnFilters.dateSearch}
                                                            onChange={(e) => setColumnFilters({ ...columnFilters, dateSearch: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                                        />

                                                        <div className="space-y-1">
                                                            <div className="font-medium text-slate-400 text-[11px]">Valeurs uniques :</div>
                                                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                                                <label className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={columnFilters.selectedDates.length === 0}
                                                                        onChange={() => setColumnFilters({ ...columnFilters, selectedDates: [] })}
                                                                        className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                                                    />
                                                                    <span className="font-semibold text-indigo-400">(Toutes)</span>
                                                                </label>

                                                                {filteredDatesInPopover.map((d) => (
                                                                    <label key={d} className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={columnFilters.selectedDates.includes(d)}
                                                                            onChange={() =>
                                                                                setColumnFilters({
                                                                                    ...columnFilters,
                                                                                    selectedDates: toggleArrayItem(columnFilters.selectedDates, d),
                                                                                })
                                                                            }
                                                                            className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                                                        />
                                                                        <span className="text-slate-300 font-mono">{formatDate(d)}</span>
                                                                    </label>
                                                                ))}

                                                                {filteredDatesInPopover.length === 0 && (
                                                                    <div className="text-slate-500 italic p-2 text-[11px]">
                                                                        Aucune date correspondante
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isColumnFiltered('date') && (
                                                        <button
                                                            onClick={() => setColumnFilters({ ...columnFilters, dateSearch: '', selectedDates: [] })}
                                                            className="w-full py-1 text-center text-indigo-400 hover:underline text-[11px]"
                                                        >
                                                            Effacer ce filtre
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </th>

                                        {/* Type de dépense Column Header */}
                                        <th className="p-3 w-56 border-r border-slate-800/60 relative">
                                            <div className="flex items-center justify-between">
                                                <span onClick={() => handleSort('expense_type')} className="cursor-pointer hover:text-white flex items-center space-x-1">
                                                    <span>Type de dépense</span>
                                                    {sortConfig.key === 'expense_type' && (
                                                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                                                    )}
                                                </span>

                                                <button
                                                    onClick={() => setOpenFilterCol(openFilterCol === 'expense_type' ? null : 'expense_type')}
                                                    className={`p-1 rounded-md transition cursor-pointer ${
                                                        isColumnFiltered('expense_type')
                                                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }`}
                                                    title="Filtrer la colonne Type de dépense"
                                                >
                                                    <Filter className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Type de dépense Excel Filter Popover */}
                                            {openFilterCol === 'expense_type' && (
                                                <div ref={popoverRef} className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs normal-case font-normal space-y-3">
                                                    <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2 flex justify-between items-center">
                                                        <span>Filtre Excel: Type de dépense</span>
                                                        <button onClick={() => setOpenFilterCol(null)} className="text-slate-400 hover:text-white">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <button
                                                            onClick={() => {
                                                                setSortConfig({ key: 'expense_type', direction: 'asc' });
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                                                        >
                                                            <span>Trier de A à Z</span>
                                                            <ArrowDown className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSortConfig({ key: 'expense_type', direction: 'desc' });
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                                                        >
                                                            <span>Trier de Z à A</span>
                                                            <ArrowUp className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Filter input inside Type popover */}
                                                    <div className="border-t border-slate-800 pt-2 space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Rechercher un type..."
                                                            value={columnFilters.expenseTypeSearch}
                                                            onChange={(e) => setColumnFilters({ ...columnFilters, expenseTypeSearch: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                                        />

                                                        <div className="space-y-1">
                                                            <div className="font-medium text-slate-400 text-[11px]">Valeurs uniques :</div>
                                                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                                <label className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={columnFilters.selectedExpenseTypeIds.length === 0}
                                                                        onChange={() => setColumnFilters({ ...columnFilters, selectedExpenseTypeIds: [] })}
                                                                        className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                                                    />
                                                                    <span className="font-semibold text-indigo-400">(Tous)</span>
                                                                </label>

                                                                {/* Option Non catégorisé */}
                                                                {showNoneCategoryInPopover && (
                                                                    <label className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={columnFilters.selectedExpenseTypeIds.includes('none')}
                                                                            onChange={() =>
                                                                                setColumnFilters({
                                                                                    ...columnFilters,
                                                                                    selectedExpenseTypeIds: toggleArrayItem(columnFilters.selectedExpenseTypeIds, 'none'),
                                                                                })
                                                                            }
                                                                            className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                                                        />
                                                                        <span className="text-amber-400 italic">Non catégorisé</span>
                                                                    </label>
                                                                )}

                                                                {filteredExpenseTypesInPopover.map((t) => (
                                                                    <label key={t.id} className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={columnFilters.selectedExpenseTypeIds.includes(String(t.id))}
                                                                            onChange={() =>
                                                                                setColumnFilters({
                                                                                    ...columnFilters,
                                                                                    selectedExpenseTypeIds: toggleArrayItem(columnFilters.selectedExpenseTypeIds, String(t.id)),
                                                                                })
                                                                            }
                                                                            className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                                                        />
                                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#6366f1' }} />
                                                                        <span className="text-slate-300 truncate">{t.name}</span>
                                                                    </label>
                                                                ))}

                                                                {filteredExpenseTypesInPopover.length === 0 && !showNoneCategoryInPopover && (
                                                                    <div className="text-slate-500 italic p-2 text-[11px]">
                                                                        Aucun type correspondant
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isColumnFiltered('expense_type') && (
                                                        <button
                                                            onClick={() => setColumnFilters({ ...columnFilters, expenseTypeSearch: '', selectedExpenseTypeIds: [] })}
                                                            className="w-full py-1 text-center text-indigo-400 hover:underline text-[11px]"
                                                        >
                                                            Effacer ce filtre
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </th>

                                        {/* Intitulé Column Header */}
                                        <th className="p-3 border-r border-slate-800/60 relative">
                                            <div className="flex items-center justify-between">
                                                <span onClick={() => handleSort('label')} className="cursor-pointer hover:text-white flex items-center space-x-1">
                                                    <span>Intitulé</span>
                                                    {sortConfig.key === 'label' && (
                                                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                                                    )}
                                                </span>

                                                <button
                                                    onClick={() => setOpenFilterCol(openFilterCol === 'label' ? null : 'label')}
                                                    className={`p-1 rounded-md transition cursor-pointer ${
                                                        isColumnFiltered('label')
                                                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }`}
                                                    title="Filtrer la colonne Intitulé"
                                                >
                                                    <Filter className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Intitulé Excel Filter Popover */}
                                            {openFilterCol === 'label' && (
                                                <div ref={popoverRef} className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs normal-case font-normal space-y-3">
                                                    <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2 flex justify-between items-center">
                                                        <span>Filtre Excel: Intitulé</span>
                                                        <button onClick={() => setOpenFilterCol(null)} className="text-slate-400 hover:text-white">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <button
                                                            onClick={() => {
                                                                setSortConfig({ key: 'label', direction: 'asc' });
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                                                        >
                                                            <span>Trier de A à Z</span>
                                                            <ArrowDown className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSortConfig({ key: 'label', direction: 'desc' });
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                                                        >
                                                            <span>Trier de Z à A</span>
                                                            <ArrowUp className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Filter input inside Intitulé popover */}
                                                    <div className="border-t border-slate-800 pt-2 space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Rechercher un intitulé..."
                                                            value={columnFilters.labelSearch}
                                                            onChange={(e) => setColumnFilters({ ...columnFilters, labelSearch: e.target.value })}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                                        />

                                                        <div className="space-y-1">
                                                            <div className="font-medium text-slate-400 text-[11px]">Valeurs uniques :</div>
                                                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                                <label className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={columnFilters.selectedLabels.length === 0}
                                                                        onChange={() => setColumnFilters({ ...columnFilters, selectedLabels: [] })}
                                                                        className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                                                    />
                                                                    <span className="font-semibold text-indigo-400">(Tous)</span>
                                                                </label>

                                                                {filteredLabelsInPopover.map((lbl) => (
                                                                    <label key={lbl} className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={columnFilters.selectedLabels.includes(lbl)}
                                                                            onChange={() =>
                                                                                setColumnFilters({
                                                                                    ...columnFilters,
                                                                                    selectedLabels: toggleArrayItem(columnFilters.selectedLabels, lbl),
                                                                                })
                                                                            }
                                                                            className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                                                        />
                                                                        <span className="text-slate-300 truncate">{lbl}</span>
                                                                    </label>
                                                                ))}

                                                                {filteredLabelsInPopover.length === 0 && (
                                                                    <div className="text-slate-500 italic p-2 text-[11px]">
                                                                        Aucun intitulé correspondant
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isColumnFiltered('label') && (
                                                        <button
                                                            onClick={() => setColumnFilters({ ...columnFilters, labelSearch: '', selectedLabels: [] })}
                                                            className="w-full py-1 text-center text-indigo-400 hover:underline text-[11px]"
                                                        >
                                                            Effacer ce filtre
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </th>

                                        <th className="p-3 w-12 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-medium">
                                    {/* Flat List View Mode */}
                                    {viewMode === 'table' && (
                                        filteredOperations.map((op) => renderOperationRow(op, false, null))
                                    )}

                                    {/* Grouped (Google Sheets) View Mode */}
                                    {viewMode === 'grouped' && (
                                        groupedOperations.map((group) => {
                                            const isCollapsed = collapsedGroups.includes(group.key);
                                            const groupItemIds = group.items.map((i) => i.id);
                                            const isAllGroupSelected = groupItemIds.length > 0 && groupItemIds.every((id) => selectedIds.includes(id));
                                            const isSomeGroupSelected = groupItemIds.some((id) => selectedIds.includes(id)) && !isAllGroupSelected;

                                            return (
                                                <React.Fragment key={group.key}>
                                                    {/* Google Sheets Group Header Row */}
                                                    <tr className="bg-slate-950/90 hover:bg-slate-900 border-t-2 border-b border-slate-800 transition-colors select-none">
                                                        {/* Group Checkbox */}
                                                        <td className="p-3 text-center border-r border-slate-800/60 bg-slate-950/70">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllGroupSelected}
                                                                ref={(el) => {
                                                                    if (el) el.indeterminate = isSomeGroupSelected;
                                                                }}
                                                                onChange={() => handleSelectGroup(group.items)}
                                                                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </td>

                                                        {/* Group Title with Expand/Collapse Action */}
                                                        <td
                                                            colSpan={3}
                                                            onClick={() => toggleGroupCollapse(group.key)}
                                                            className="p-3.5 cursor-pointer border-r border-slate-800/60"
                                                        >
                                                            <div className="flex items-center space-x-3">
                                                                <button
                                                                    type="button"
                                                                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                                                                >
                                                                    {isCollapsed ? (
                                                                        <ChevronRight className="w-4 h-4 text-indigo-400" />
                                                                    ) : (
                                                                        <ChevronDown className="w-4 h-4 text-indigo-400" />
                                                                    )}
                                                                </button>

                                                                <div className="flex items-center space-x-2.5 min-w-0">
                                                                    <span
                                                                        className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-white/20 shrink-0"
                                                                        style={{ backgroundColor: group.expenseType.color || '#6366f1' }}
                                                                    />
                                                                    <span className="font-bold text-white text-sm tracking-wide truncate">
                                                                        {group.expenseType.name}
                                                                    </span>
                                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium shrink-0">
                                                                        {group.count} opération{group.count > 1 ? 's' : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Group Financial Subtotal */}
                                                        <td
                                                            onClick={() => toggleGroupCollapse(group.key)}
                                                            className="p-3.5 text-right whitespace-nowrap border-r border-slate-800/60 cursor-pointer"
                                                        >
                                                            <div className="space-y-0.5">
                                                                <div className={`text-xs font-mono font-extrabold ${group.netBalance >= 0 ? 'text-indigo-400' : 'text-slate-200'}`}>
                                                                    {formatAmount(group.netBalance)}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 space-x-2 font-mono flex items-center justify-end">
                                                                    {group.totalDebits < 0 && (
                                                                        <span className="text-rose-400 font-semibold">
                                                                            {formatAmount(group.totalDebits)}
                                                                        </span>
                                                                    )}
                                                                    {group.totalCredits > 0 && (
                                                                        <span className="text-emerald-400 font-semibold">
                                                                            +{formatAmount(group.totalCredits)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Group State Info & Collapse Hint */}
                                                        <td
                                                            colSpan={2}
                                                            onClick={() => toggleGroupCollapse(group.key)}
                                                            className="p-3.5 text-xs text-slate-400 cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="italic text-slate-400 text-[11px]">
                                                                    {isCollapsed ? 'Cliquez pour afficher le détail' : 'Sous-total de catégorie'}
                                                                </span>
                                                                <span className="text-[11px] text-indigo-400 font-semibold flex items-center space-x-1">
                                                                    <span>{isCollapsed ? 'Déplier' : 'Replier'}</span>
                                                                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Group Operations Rows */}
                                                    {!isCollapsed && group.items.map((op) => renderOperationRow(op, true, group.expenseType.color))}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
</AppLayout>
    );
}
