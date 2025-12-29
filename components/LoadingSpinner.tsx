import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`} />
      <span className="sr-only">{label}</span>
    </div>
  );
};
