import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export default function ExpenseTypeSelect({
    value,
    expenseTypes = [],
    onChange,
    placeholder = "-- Sélectionner un type --",
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Find selected expense type object
    const selectedType = useMemo(() => {
        if (!value) return null;
        return expenseTypes.find((t) => String(t.id) === String(value)) || null;
    }, [value, expenseTypes]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Filtered expense types if search query is typed
    const filteredTypes = useMemo(() => {
        if (!searchQuery.trim()) return expenseTypes;
        return expenseTypes.filter((t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [expenseTypes, searchQuery]);

    const handleSelect = (typeId) => {
        onChange(typeId);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className={`relative w-full ${isOpen ? 'z-40' : 'z-10'}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full text-xs font-medium rounded-xl px-3 py-2 border transition duration-150 flex items-center justify-between gap-2 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    selectedType
                        ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80'
                        : 'bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-950/40 hover:border-amber-500/50'
                }`}
                style={{
                    borderColor: selectedType?.color ? `${selectedType.color}80` : undefined,
                    boxShadow: selectedType?.color && isOpen ? `0 0 12px ${selectedType.color}30` : undefined,
                }}
            >
                <div className="flex items-center space-x-2.5 min-w-0 truncate">
                    {selectedType ? (
                        <>
                            <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-1 ring-white/20"
                                style={{ backgroundColor: selectedType.color || '#6366f1' }}
                            />
                            <span className="font-semibold text-slate-100 truncate">{selectedType.name}</span>
                        </>
                    ) : (
                        <>
                            <span className="w-3 h-3 rounded-full shrink-0 border border-dashed border-amber-400/60 bg-amber-400/20" />
                            <span className="text-amber-300/90 italic truncate">{placeholder}</span>
                        </>
                    )}
                </div>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu Popover */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 max-w-[280px] bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* Search input if items > 4 */}
                    {expenseTypes.length > 4 && (
                        <div className="p-1 mb-1 relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher une catégorie..."
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                        {/* Option: Non catégorisé / Réinitialiser */}
                        <button
                            type="button"
                            onClick={() => handleSelect(null)}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                                !value
                                    ? 'bg-indigo-500/15 text-amber-300 font-semibold border border-indigo-500/30'
                                    : 'text-amber-300/80 hover:bg-slate-800/80 hover:text-amber-200'
                            }`}
                        >
                            <div className="flex items-center space-x-2.5 truncate">
                                <span className="w-3 h-3 rounded-full shrink-0 border border-dashed border-amber-400/70 bg-amber-400/20" />
                                <span className="italic">{placeholder}</span>
                            </div>
                            {!value && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />}
                        </button>

                        <div className="my-1 border-t border-slate-800/80" />

                        {/* List of Expense Types */}
                        {filteredTypes.length === 0 ? (
                            <div className="px-3 py-3 text-center text-xs text-slate-500 italic">
                                Aucune catégorie trouvée
                            </div>
                        ) : (
                            filteredTypes.map((type) => {
                                const isSelected = String(value) === String(type.id);

                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => handleSelect(type.id)}
                                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                                            isSelected
                                                ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/40 shadow-sm'
                                                : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2.5 truncate">
                                            {/* Rond de couleur en entête de chaque ligne */}
                                            <span
                                                className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-1 ring-white/20"
                                                style={{ backgroundColor: type.color || '#6366f1' }}
                                            />
                                            <span className="truncate">{type.name}</span>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-2" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
