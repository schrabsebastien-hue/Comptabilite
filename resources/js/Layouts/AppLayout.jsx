import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Settings, Upload, CheckCircle2, AlertCircle, TrendingUp, BarChart3, Wallet, Shield, Sun, Moon } from 'lucide-react';
import ImportModal from '../Components/ImportModal';
import { useTheme } from '../Components/ThemeProvider';

export default function AppLayout({ children, title, fullWidth = false }) {
    const { flash } = usePage().props;
    const page = usePage();
    const url = page.url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const [showImportModal, setShowImportModal] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const isOperationsActive = url === '/' || (url.startsWith('/operations') && !url.startsWith('/synthese') && !url.startsWith('/graphiques'));
    const isSyntheseActive = url.startsWith('/synthese');
    const isGraphiquesActive = url.startsWith('/graphiques');
    const isExpenseTypesActive = url.startsWith('/expense-types');

    return (
        <div className="min-h-screen bg-surface text-on-surface flex flex-col ">
            {/* Top Header Navbar */}
            <header className="sticky top-0 z-30 bg-surface-raised/80 backdrop-blur-md border-b border-edge/80 shadow-lg">
                <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Logo & App Title */}
                    <div className="flex items-center space-x-8">
                        <Link href="/" className="flex items-center space-x-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                                <div className="w-full h-full bg-surface rounded-[10px] flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-accent" />
                                </div>
                            </div>
                            <div>
                                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-grad-from via-grad-via to-grad-to bg-clip-text text-transparent">
                                    Comptabilité
                                </span>
                                <span className="block text-[10px] font-medium text-on-surface-muted tracking-wider uppercase">
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
                                        ? 'bg-accent-bg text-accent border border-accent-border shadow-inner'
                                        : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated/50'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Liste des opérations</span>
                            </Link>

                            <Link
                                href="/synthese"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                                    isSyntheseActive
                                        ? 'bg-accent-bg text-accent border border-accent-border shadow-inner'
                                        : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated/50'
                                }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                <span>Synthèse</span>
                            </Link>

                            <Link
                                href="/graphiques"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                                    isGraphiquesActive
                                        ? 'bg-accent-bg text-accent border border-accent-border shadow-inner'
                                        : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated/50'
                                }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                <span>Graphiques</span>
                            </Link>

                            <Link
                                href="/expense-types"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                                    isExpenseTypesActive
                                        ? 'bg-accent-bg text-accent border border-accent-border shadow-inner'
                                        : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated/50'
                                }`}
                            >
                                <Settings className="w-4 h-4" />
                                <span>Types de dépenses (Admin)</span>
                            </Link>
                        </nav>
                    </div>

                    {/* Actions Right */}
                    <div className="flex items-center space-x-3">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl border border-edge-strong/50 bg-surface-elevated/50 hover:bg-surface-elevated text-on-surface-muted hover:text-accent transition-all duration-200 cursor-pointer"
                            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4" />
                            ) : (
                                <Moon className="w-4 h-4" />
                            )}
                        </button>

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
            <div className="md:hidden bg-surface-raised/90 border-b border-edge px-4 py-2 flex items-center justify-around text-xs">
                <Link
                    href="/"
                    className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-lg ${
                        isOperationsActive ? 'text-accent font-semibold' : 'text-on-surface-muted'
                    }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Opérations</span>
                </Link>
                <Link
                    href="/synthese"
                    className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-lg ${
                        isSyntheseActive ? 'text-accent font-semibold' : 'text-on-surface-muted'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>Synthèse</span>
                </Link>
                <Link
                    href="/graphiques"
                    className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-lg ${
                        isGraphiquesActive ? 'text-accent font-semibold' : 'text-on-surface-muted'
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    <span>Graphiques</span>
                </Link>
                <Link
                    href="/expense-types"
                    className={`flex flex-col items-center space-y-1 py-1 px-2 rounded-lg ${
                        isExpenseTypesActive ? 'text-accent font-semibold' : 'text-on-surface-muted'
                    }`}
                >
                    <Settings className="w-4 h-4" />
                    <span>Types</span>
                </Link>
            </div>

            {/* Notifications / Flash Toast */}
            <div className="w-full px-4 sm:px-6 lg:px-8 pt-4">
                {flash?.success && (
                    <div className="mb-4 p-4 rounded-xl bg-positive-bg border border-positive-border text-positive-light flex items-center space-x-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 text-positive shrink-0" />
                        <div className="text-sm font-medium">{flash.success}</div>
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 p-4 rounded-xl bg-negative-bg border border-negative-border text-negative-light flex items-center space-x-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 text-negative shrink-0" />
                        <div className="text-sm font-medium">{flash.error}</div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-edge/60 bg-surface/50 py-4 text-center text-xs text-on-surface-muted">
                <div className="w-full px-4 sm:px-6 lg:px-8">
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
