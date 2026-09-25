import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

const iconSizes = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-10 w-10',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const trimmedUrl = avatarUrl?.trim();
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  if (trimmedUrl && !imageError) {
    return (
      <img
        src={trimmedUrl}
        alt={name}
        onError={() => setImageError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0 ring-1 ring-slate-200/80 shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-slate-100 via-indigo-50/80 to-violet-100/60 border border-slate-200/90 text-indigo-900 font-semibold flex items-center justify-center shrink-0 shadow-xs select-none ${className}`}
      title={name}
    >
      {initial !== '?' ? (
        <span>{initial}</span>
      ) : (
        <UserIcon className={`${iconSizes[size]} text-indigo-400`} />
      )}
    </div>
  );
};
