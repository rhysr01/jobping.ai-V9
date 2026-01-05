"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { BrandIcons } from "./BrandIcons";

interface CalendarPickerProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
}

export default function CalendarPicker({
  value,
  onChange,
  minDate,
}: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });

  const selectedDate = value ? new Date(value) : null;

  const today = new Date();
  const minDateObj = minDate ? new Date(minDate) : today;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const isDateDisabled = (date: Date) => {
    return date < minDateObj;
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    if (!isDateDisabled(date)) {
      onChange(date.toISOString().split("T")[0]);
      setIsOpen(false);
    }
  };

  const navigateMonth = (direction: number) => {
    setViewDate(new Date(year, month + direction, 1));
  };

  const formatDisplayDate = () => {
    if (!value) return "Select date";
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="relative">
      {/* Input trigger */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full px-5 py-4 bg-surface-elevated/40 border-2 border-zinc-700 rounded-2xl text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all text-lg flex items-center justify-between group hover:border-zinc-600 hover:bg-surface-elevated/60"
      >
        <div className="flex items-center gap-3">
          <BrandIcons.Clock className="w-5 h-5 text-content-muted group-hover:text-brand-400 transition-colors" />
          <span className={value ? "text-white" : "text-content-muted"}>
            {formatDisplayDate()}
          </span>
        </div>
        <svg
          className="w-5 h-5 text-content-muted group-hover:text-brand-400 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      </motion.button>

      {/* Calendar dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close calendar"
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute z-50 mt-2 w-full bg-surface-elevated border-2 border-brand-500/30 rounded-2xl shadow-glow-strong overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 border-b border-border-subtle">
              <div className="flex items-center justify-between mb-4">
                <motion.button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-content-muted hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </motion.button>

                <div className="text-white font-bold text-lg">
                  {monthNames[month]} {year}
                </div>

                <motion.button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-content-muted hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 p-2 bg-surface-elevated/50">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-content-muted py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 p-2">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const disabled = isDateDisabled(date);
                const selected = isDateSelected(date);
                const isToday = date.toDateString() === today.toDateString();

                return (
                  <motion.button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    disabled={disabled}
                    whileHover={!disabled ? { scale: 1.1 } : {}}
                    whileTap={!disabled ? { scale: 0.9 } : {}}
                    className={`aspect-square rounded-lg text-sm font-semibold transition-all relative ${
                      disabled
                        ? "text-content-disabled cursor-not-allowed"
                        : selected
                          ? "bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-glow-subtle"
                          : isToday
                            ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                            : "text-content-secondary hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {day}
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <BrandIcons.Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border-subtle bg-surface-elevated/50">
              <div className="flex items-center justify-between text-xs text-content-muted">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-700 border border-zinc-600"></div>
                  <span>Unavailable</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
