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

// Convert ISO (YYYY-MM-DD) to Display (DD/MM/YYYY)
export function isoToDisplay(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

// Convert Display (DD/MM/YYYY) to ISO (YYYY-MM-DD), returning '' if invalid calendar date
export function displayToIso(displayDate: string, maxDateStr?: string, minDateStr?: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(displayDate)) return '';
  const [dStr, mStr, yStr] = displayDate.split('/');
  const day = parseInt(dStr, 10);
  const month = parseInt(mStr, 10);
  const year = parseInt(yStr, 10);

  const minYear = minDateStr ? parseInt(minDateStr.split('-')[0], 10) : 1900;
  if (year < minYear) return '';

  const today = new Date();
  const currentYear = today.getFullYear();
  if (year > currentYear) return '';

  if (month < 1 || month > 12) return '';
  if (day < 1 || day > 31) return '';

  // Validate exact calendar day (e.g. reject Feb 31 or Apr 31)
  const dateObj = new Date(year, month - 1, day);
  if (
    isNaN(dateObj.getTime()) ||
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return '';
  }

  // Reject future dates
  const maxD = maxDateStr ? new Date(maxDateStr + 'T23:59:59') : today;
  maxD.setHours(23, 59, 59, 999);
  if (dateObj > maxD) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
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
  const [popoverPos, setPopoverPos] = useState<'down' | 'up'>('down');

  // Input field display string (DD/MM/YYYY)
  const [inputText, setInputText] = useState<string>(() => isoToDisplay(value));

  // Sync input text when parent value (YYYY-MM-DD) changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setInputText(isoToDisplay(value));
    } else if (!value && inputText.length === 10) {
      // If external value is cleared, clear input
      setInputText('');
    }
  }, [value]);

  // Default maxDate to today (local YYYY-MM-DD)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const effectiveMaxDate = maxDate || todayStr;

  // Active view date for calendar navigation
  const parsedInitial = value ? new Date(value + 'T00:00:00') : new Date(today.getFullYear() - 20, 0, 1);
  const [viewYear, setViewYear] = useState<number>(!isNaN(parsedInitial.getTime()) ? parsedInitial.getFullYear() : today.getFullYear() - 20);
  const [viewMonth, setViewMonth] = useState<number>(!isNaN(parsedInitial.getTime()) ? parsedInitial.getMonth() : 0);

  // Sync calendar view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Handle smart popover positioning (up vs down)
  const toggleCalendar = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Popover height is ~300px
      if (spaceBelow < 310 && rect.top > 310) {
        setPopoverPos('up');
      } else {
        setPopoverPos('down');
      }
    }
    setIsOpen(prev => !prev);
  };

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

  // Manual typing change handler with automatic "/" insertion
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const nativeEvent = e.nativeEvent as InputEvent;
    const isDeleting = nativeEvent.inputType?.startsWith('delete') || false;

    // Extract digits only up to 8 max (DDMMYYYY)
    const digits = raw.replace(/\D/g, '').slice(0, 8);

    let formatted = '';
    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length <= 2) {
      formatted = (digits.length === 2 && !isDeleting) ? `${digits}/` : digits;
    } else if (digits.length <= 4) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2);
      formatted = (digits.length === 4 && !isDeleting) ? `${day}/${month}/` : `${day}/${month}`;
    } else {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      formatted = `${day}/${month}/${year}`;
    }

    setInputText(formatted);

    // Validate and convert to ISO when length reaches 10 (DD/MM/YYYY)
    if (formatted.length === 10) {
      const iso = displayToIso(formatted, effectiveMaxDate, minDate);
      onChange(iso); // Passes YYYY-MM-DD if valid, or '' if invalid
    } else {
      onChange(''); // Incomplete date
    }
  };

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
    setInputText(isoToDisplay(dateStr));
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

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Input Field with Calendar Trigger Button */}
      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          className={`w-full rounded-xl border bg-white/80 pl-3.5 pr-16 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-50'
              : isOpen
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
              : error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
          }`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {inputText && !disabled && (
            <button
              type="button"
              onClick={() => {
                setInputText('');
                onChange('');
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear date"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={toggleCalendar}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Toggle calendar picker"
            aria-label="Toggle calendar picker"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
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

      {/* Compact Viewport-Aware Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendar date picker"
          className={`absolute z-50 w-[280px] sm:w-[290px] rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
            popoverPos === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* Header: Month & Year controls */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-1">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-semibold text-slate-800 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer"
                aria-label="Select month"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m.slice(0, 3)}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-semibold text-slate-800 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer"
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
              className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
            {DAYS_OF_WEEK.map(d => (
              <span key={d} className="text-[10px] font-semibold text-slate-400 py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-7 w-7" />
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
                  className={`h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
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
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Date of Birth recovery</span>
            {value && (
              <span className="font-mono text-slate-600 bg-slate-50 px-1 py-0.5 rounded text-[10px]">
                {value}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
