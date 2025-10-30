'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface FormFieldErrorProps {
  error?: string;
  id?: string;
}

/**
 * Enhanced form field error component with smooth animations
 */
export function FormFieldError({ error, id }: FormFieldErrorProps) {
  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.p
        id={id}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className="mt-2 text-sm text-red-400 flex items-center gap-2"
        role="alert"
        aria-live="polite"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </motion.p>
    </AnimatePresence>
  );
}

interface FormFieldSuccessProps {
  message?: string;
}

/**
 * Form field success indicator
 */
export function FormFieldSuccess({ message }: FormFieldSuccessProps) {
  if (!message) return null;

  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 text-sm text-green-400 flex items-center gap-2"
      role="status"
      aria-live="polite"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </motion.p>
  );
}

interface FormFieldHelperProps {
  helper?: string;
  characterCount?: number;
  maxLength?: number;
}

/**
 * Form field helper text with optional character count
 */
export function FormFieldHelper({ helper, characterCount, maxLength }: FormFieldHelperProps) {
  if (!helper && (!characterCount || !maxLength)) return null;

  return (
    <div className="mt-2 flex items-center justify-between">
      {helper && (
        <p className="text-xs text-zinc-500">{helper}</p>
      )}
      {characterCount !== undefined && maxLength && (
        <p className={`text-xs ${characterCount > maxLength * 0.9 ? 'text-yellow-400' : 'text-zinc-500'}`}>
          {characterCount}/{maxLength}
        </p>
      )}
    </div>
  );
}

