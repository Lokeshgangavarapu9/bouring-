import React, { useState, useRef, useEffect, useId } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  minDate?: string; // YYYY-MM-DD, defaults to 1900-01-01
  maxDate?: string; // YYYY-MM-DD, defaults to today
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select your date of birth',
  label = 'Date of Birth',
  error,
  helperText,
  disabled = false,
  minDate = '1900-01-01',
  maxDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(false);

  // Default maxDate to today (local YYYY-MM-DD)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const effectiveMaxDate = maxDate || todayStr;

  // Active view date for calendar navigation
  const parsedInitial = value ? new Date(value + 'T00:00:00') : new Date(today.getFullYear() - 20, 0, 1);
  const [viewYear, setViewYear] = useState<number>(!isNaN(parsedInitial.getTime()) ? parsedInitial.getFullYear() : today.getFullYear() - 20);
  const [viewMonth, setViewMonth] = useState<number>(!isNaN(parsedInitial.getTime()) ? parsedInitial.getMonth() : 0);

  // Sync calendar view year/month when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Generate Year options from current year down to minYear (e.g. 1900)
  const currentYear = today.getFullYear();
  const minYear = parseInt(minDate.split('-')[0], 10) || 1900;
  const years: number[] = [];
  for (let y = currentYear; y >= minYear; y--) {
    years.push(y);
  }

  // Calculate days in month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const isDateDisabled = (day: number): boolean => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (effectiveMaxDate && dateStr > effectiveMaxDate) return true;
    if (minDate && dateStr < minDate) return true;
    return false;
  };

  const isSelected = (day: number): boolean => {
    if (!value) return false;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return value === dateStr;
  };

  const isToday = (day: number): boolean => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return todayStr === dateStr;
  };

  // Format display text (e.g. "October 14, 1998")
  const formatDisplay = (val: string) => {
    if (!val) return '';
    try {
      const parts = val.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (m >= 0 && m < 12 && d > 0 && d <= 31) {
          return `${MONTHS[m]} ${d}, ${y}`;
        }
      }
      return val;
    } catch {
      return val;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Input / Trigger */}
      <div
        id={inputId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
        className={`w-full flex items-center justify-between rounded-xl border bg-white/80 px-3.5 py-2 text-sm transition-all cursor-pointer select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-50'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
            : error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon className={`h-4 w-4 shrink-0 transition-colors ${isOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className={`truncate ${value ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Clear date"
            aria-label="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-slate-400">
          <span>{helperText}</span>
        </p>
      ) : null}

      {/* Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendar date picker"
          className="absolute z-50 mt-1.5 w-72 sm:w-80 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header: Month & Year controls */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-semibold text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                aria-label="Select month"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-semibold text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                aria-label="Select year"
              >
                {years.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={viewYear === currentYear && viewMonth >= today.getMonth()}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map(d => (
              <span key={d} className="text-[11px] font-semibold text-slate-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-8 w-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const disabledDay = isDateDisabled(day);
              const selected = isSelected(day);
              const todayDate = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-medium transition-all ${
                    selected
                      ? 'bg-slate-900 text-white font-semibold shadow-xs scale-105'
                      : todayDate
                      ? 'border border-indigo-400 text-indigo-700 font-semibold bg-indigo-50/50 hover:bg-indigo-100/60'
                      : disabledDay
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Date of Birth recovery</span>
            {value && (
              <span className="font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                {value}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
