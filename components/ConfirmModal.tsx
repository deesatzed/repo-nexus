import React from 'react';
import FocusTrap from 'focus-trap-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    isDestructive = false,
    isLoading = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                    aria-describedby="confirm-message"
                    className="bg-[#0f172a] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 overflow-hidden"
                >
                    <h3 id="confirm-title" className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p id="confirm-message" className="text-slate-400 text-sm mb-6 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                } disabled:opacity-50`}
                        >
                            {isLoading && (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </FocusTrap>
        </div>
    );
};
