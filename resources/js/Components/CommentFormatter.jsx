import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Palette, RotateCcw, Check, X } from 'lucide-react';

const PRESET_COLORS = [
    { label: 'Blanc', value: '#ffffff', class: 'bg-white' },
    { label: 'Rouge', value: '#f43f5e', class: 'bg-rose-500' },
    { label: 'Vert', value: '#10b981', class: 'bg-emerald-500' },
    { label: 'Ambre', value: '#f59e0b', class: 'bg-amber-500' },
    { label: 'Bleu', value: '#3b82f6', class: 'bg-blue-500' },
    { label: 'Violet', value: '#a855f7', class: 'bg-purple-500' },
    { label: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
];

export default function CommentFormatter({ value, onSave, onCancel, isEditing, onStartEdit }) {
    const [draft, setDraft] = useState(value || '');
    const [selectedColor, setSelectedColor] = useState(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        setDraft(value || '');
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    // Apply formatting tags (Bold, Italic, Color) to selection or whole draft
    const applyTag = (tagOpen, tagClose) => {
        if (!inputRef.current) return;
        const el = inputRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;

        let newText = draft;
        if (start !== undefined && end !== undefined && start !== end) {
            const selectedText = draft.substring(start, end);
            newText = draft.substring(0, start) + `${tagOpen}${selectedText}${tagClose}` + draft.substring(end);
        } else {
            // Whole text if nothing selected
            newText = `${tagOpen}${draft}${tagClose}`;
        }
        setDraft(newText);
    };

    const handleToggleBold = () => {
        applyTag('<b>', '</b>');
    };

    const handleToggleItalic = () => {
        applyTag('<i>', '</i>');
    };

    const handleApplyColor = (colorHex) => {
        applyTag(`<span style="color:${colorHex}">`, '</span>');
    };

    const handleClearFormatting = () => {
        // Strip basic formatting tags
        const clean = draft.replace(/<\/?(b|i|em|strong|u|span)[^>]*>/gi, '');
        setDraft(clean);
    };

    const handleSave = () => {
        onSave(draft);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    // Helper to render HTML safely for small formatting tags
    const renderFormattedHtml = (htmlContent) => {
        if (!htmlContent || !htmlContent.trim()) {
            return (
                <span className="text-xs text-on-surface-faint/30 italic font-normal tracking-wide">
                    Aucun commentaire
                </span>
            );
        }

        // Sanitize: allow only b, i, em, strong, u, span with style color
        const cleanHtml = htmlContent
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '');

        return (
            <div
                className="text-xs text-slate-100 font-semibold leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
        );
    };

    if (!isEditing) {
        return (
            <div
                onClick={onStartEdit}
                className="cursor-pointer hover:bg-surface-elevated/90 px-2 py-1.5 rounded-lg transition-all border border-transparent hover:border-indigo-500/30 flex items-center justify-between min-w-0 group"
                title={value ? 'Cliquer pour modifier le commentaire' : 'Ajouter un commentaire'}
            >
                <div className="truncate min-w-0 w-full">
                    {renderFormattedHtml(value)}
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative z-20 space-y-1.5 bg-surface-elevated/95 p-2 rounded-xl border border-indigo-500/50 shadow-xl backdrop-blur-sm">
            {/* Formatting Toolbar */}
            <div className="flex items-center justify-between gap-1 bg-surface-raised p-1 rounded-lg border border-edge/40">
                <div className="flex items-center space-x-1">
                    <button
                        type="button"
                        onClick={handleToggleBold}
                        className="p-1 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated transition cursor-pointer font-bold"
                        title="Mettre en gras (<b>)"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleToggleItalic}
                        className="p-1 rounded text-on-surface-muted hover:text-white hover:bg-surface-elevated transition cursor-pointer italic"
                        title="Mettre en italique (<i>)"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-3.5 w-px bg-edge/60 mx-1" />

                    {/* Color Swatches */}
                    <div className="flex items-center space-x-1">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => handleApplyColor(c.value)}
                                className={`w-3.5 h-3.5 rounded-full ${c.class} hover:scale-110 transition cursor-pointer ring-1 ring-white/20`}
                                title={`Couleur ${c.label}`}
                            />
                        ))}
                    </div>

                    <div className="h-3.5 w-px bg-edge/60 mx-1" />

                    <button
                        type="button"
                        onClick={handleClearFormatting}
                        className="p-1 rounded text-on-surface-faint hover:text-amber-400 hover:bg-surface-elevated transition cursor-pointer"
                        title="Effacer le formatage"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex items-center space-x-1">
                    <button
                        type="button"
                        onClick={handleSave}
                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow"
                        title="Enregistrer"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-1 rounded bg-surface-elevated text-on-surface-muted hover:text-white transition cursor-pointer"
                        title="Annuler"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Input Field */}
            <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rédiger un commentaire..."
                className="w-full bg-surface border border-indigo-500/60 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />

            {/* Live Preview */}
            {draft && (
                <div className="px-2 py-1 rounded bg-surface/50 border border-edge/30 text-[11px] text-on-surface-muted flex items-center space-x-2">
                    <span className="text-[10px] text-on-surface-faint uppercase font-bold shrink-0">Aperçu :</span>
                    <div className="truncate">{renderFormattedHtml(draft)}</div>
                </div>
            )}
        </div>
    );
}
