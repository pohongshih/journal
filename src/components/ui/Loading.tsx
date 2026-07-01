import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, message = '處理中，請稍候...' }: LoadingProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
      <div className="text-lg font-semibold text-slate-700">{message}</div>
    </div>
  );
}
