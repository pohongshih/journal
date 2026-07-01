import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  zIndex?: number;
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md', zIndex = 40 }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] h-[95vh] flex flex-col'
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4 backdrop-blur-sm" style={{ zIndex }}>
      <div className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 flex-1">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors ml-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className={`px-6 py-4 overflow-y-auto ${size === 'full' ? 'flex-1' : 'max-h-[70vh]'}`}>
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
