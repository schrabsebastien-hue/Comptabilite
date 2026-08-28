import React from 'react';
import { X, AlertTriangle, Trash2, MessageSquareX } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirmation',
    message = 'Êtes-vous sûr de vouloir effectuer cette action ?',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    variant = 'danger', // 'danger' | 'warning' | 'primary'
    icon: CustomIcon,
}) {
    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'warning':
                return {
                    iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                    iconGlow: 'bg-amber-500/10',
                    confirmBtn: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20',
                    defaultIcon: MessageSquareX,
                };
            case 'primary':
                return {
                    iconBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
                    iconGlow: 'bg-indigo-500/10',
                    confirmBtn: 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/25',
                    defaultIcon: AlertTriangle,
                };
            case 'danger':
            default:
                return {
                    iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
                    iconGlow: 'bg-rose-500/10',
                    confirmBtn: 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold shadow-lg shadow-rose-600/25',
                    defaultIcon: Trash2,
                };
        }
    };

    const styles = getVariantStyles();
    const IconComponent = CustomIcon || styles.defaultIcon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
            {/* Modal Card Container */}
            <div 
                className="bg-surface-raised border border-edge/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Subtle Background Radial Glow */}
                <div className={`absolute -top-16 -left-16 w-36 h-36 rounded-full blur-2xl pointer-events-none ${styles.iconGlow}`} />

                {/* Close X Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-on-surface-faint hover:text-white p-1.5 rounded-xl hover:bg-surface-overlay transition cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                    <div className="flex items-start space-x-4">
                        {/* Icon Badge */}
                        <div className={`p-3.5 rounded-2xl border shrink-0 ${styles.iconBg}`}>
                            <IconComponent className="w-6 h-6" />
                        </div>

                        {/* Title & Message */}
                        <div className="space-y-1.5 pt-0.5 min-w-0">
                            <h3 className="text-base font-bold text-white tracking-tight">
                                {title}
                            </h3>
                            <p className="text-xs leading-relaxed text-on-surface-secondary">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="flex items-center justify-end space-x-3 pt-2 border-t border-edge/40">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-secondary hover:text-white bg-surface-elevated/80 hover:bg-surface-overlay border border-edge-strong transition cursor-pointer"
                        >
                            {cancelText}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-xl text-xs transition cursor-pointer ${styles.confirmBtn}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
