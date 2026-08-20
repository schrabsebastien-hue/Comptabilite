import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Settings, Upload, CheckCircle2, AlertCircle, TrendingUp, Wallet, Shield } from 'lucide-react';
import ImportModal from '../Components/ImportModal';

export default function AppLayout({ children, title }) {
    const { flash } = usePage().props;
    const page = usePage();
    const url = page.url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const [showImportModal, setShowImportModal] = useState(false);

    const isOperationsActive = url === '/' || url.startsWith('/operations');
    const isExpenseTypesActive = url.startsWith('/expense-types');

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
            {/* Top Header Navbar */}
            <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Logo & App Title */}
                    <div className="flex items-center space-x-8">
                        <Link href="/" className="flex items-center space-x-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                            <div>
                                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                    Comptabilité
                                </span>
                                <span className="block text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                                    Gestion Financière
                                </span>
                            </div>
                        </Link>

                        {/* Main Navigation Links */}
                        <nav className="hidden md:flex items-center space-x-1">
                            <Link
                                href="/"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                                    isOperationsActive
                                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-inner'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Liste des opérations</span>
                            </Link>

                            <Link
                                href="/expense-types"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                                    isExpenseTypesActive
                                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-inner'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                            >
                                <Settings className="w-4 h-4" />
                                <span>Types de dépenses (Admin)</span>
                            </Link>
                        </nav>
                    </div>

                    {/* Actions Right */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 active:scale-95 transition-all duration-150 cursor-pointer"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Importer un fichier .xls</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Nav Bar */}
            <div className="md:hidden bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-around text-xs">
                <Link
                    href="/"
                    className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg ${
                        isOperationsActive ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                    }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Opérations</span>
                </Link>
                <Link
                    href="/expense-types"
                    className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg ${
                        isExpenseTypesActive ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                    }`}
                >
                    <Settings className="w-4 h-4" />
                    <span>Types Dépenses</span>
                </Link>
            </div>

            {/* Notifications / Flash Toast */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4">
                {flash?.success && (
                    <div className="mb-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center space-x-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="text-sm font-medium">{flash.success}</div>
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center space-x-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <div className="text-sm font-medium">{flash.error}</div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/60 bg-slate-950/50 py-4 text-center text-xs text-slate-400">
                <div className="max-w-7xl mx-auto px-4">
                    Comptabilité &copy; {new Date().getFullYear()} - Application bancaire sécurisée
                </div>
            </footer>

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
            />
        </div>
    );
}
