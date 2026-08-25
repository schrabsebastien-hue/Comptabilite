import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export default function ImportModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const [dragActive, setDragActive] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        file: null,
    });

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setData('file', e.dataTransfer.files[0]);
            clearErrors();
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setData('file', e.target.files[0]);
            clearErrors();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.file) return;

        post('/operations/import', {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface-raised border border-edge rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-accent">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-white">Importer des opérations</h3>
                            <p className="text-xs text-on-surface-muted">Fichier .xls généré depuis le site de votre banque</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="text-on-surface-muted hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-elevated transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Drag & Drop Area */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                            dragActive
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : data.file
                                ? 'border-emerald-500/60 bg-emerald-500/5'
                                : 'border-edge-strong/80 hover:border-edge-strong bg-surface/40'
                        }`}
                    >
                        <input
                            type="file"
                            accept=".xls,.xlsx,.csv,.txt"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        {data.file ? (
                            <div className="flex flex-col items-center space-y-2">
                                <CheckCircle className="w-10 h-10 text-positive animate-bounce" />
                                <span className="text-sm font-semibold text-positive-light">{data.file.name}</span>
                                <span className="text-xs text-on-surface-muted">
                                    ({(data.file.size / 1024).toFixed(1)} KB) - Cliquez ou glissez pour changer
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center space-y-3">
                                <UploadCloud className="w-10 h-10 text-accent" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-on-surface">
                                        Glissez-déposez votre fichier <span className="text-accent font-semibold">.xls</span> ici
                                    </p>
                                    <p className="text-xs text-on-surface-muted">ou cliquez pour parcourir vos fichiers</p>
                                </div>
                                <span className="inline-block text-[11px] px-2.5 py-1 rounded-md bg-surface-elevated text-on-surface-muted border border-edge-strong">
                                    Formats supportés : .xls, .xlsx, .csv
                                </span>
                            </div>
                        )}
                    </div>

                    {errors.file && (
                        <div className="flex items-center space-x-2 text-negative text-xs bg-rose-950/40 p-3 rounded-lg border border-rose-500/30">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errors.file}</span>
                        </div>
                    )}

                    {/* Mapping Info Box */}
                    <div className="bg-surface/60 rounded-xl p-3.5 border border-edge/80 text-xs text-on-surface-muted space-y-1.5">
                        <div className="font-semibold text-on-surface-secondary flex items-center space-x-1.5">
                            <span>Colonnes automatiquement analysées :</span>
                        </div>
                        <ul className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                            <li className="bg-surface-raised/80 px-2 py-1 rounded border border-edge">
                                <span className="text-accent font-medium">Date</span> ← Date operation
                            </li>
                            <li className="bg-surface-raised/80 px-2 py-1 rounded border border-edge">
                                <span className="text-accent font-medium">Intitulé</span> ← Sous Categorie operation
                            </li>
                            <li className="bg-surface-raised/80 px-2 py-1 rounded border border-edge">
                                <span className="text-accent font-medium">Montant</span> ← Montant operation
                            </li>
                            <li className="bg-surface-raised/80 px-2 py-1 rounded border border-edge">
                                <span className="text-accent font-medium">Commentaires</span> ← Libelle operation
                            </li>
                        </ul>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-muted hover:text-white hover:bg-surface-elevated transition cursor-pointer"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!data.file || processing}
                            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Analyse et intégration...</span>
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Lancer l'importation</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
