"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Email validation hook with debouncing
 */
export function useEmailValidation(email: string) {
  const [error, setError] = useState<string>("");
  const [isValid, setIsValid] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't validate empty email
    if (!email) {
      setError("");
      setIsValid(false);
      return;
    }

    // Debounce validation
    debounceTimer.current = setTimeout(() => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address");
        setIsValid(false);
      } else {
        setError("");
        setIsValid(true);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [email]);

  return { error, isValid };
}

/**
 * Required field validation hook
 */
export function useRequiredValidation(
  value: string | string[],
  fieldName: string,
) {
  const [error, setError] = useState<string>("");
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (Array.isArray(value)) {
      const hasValue = value.length > 0;
      setError(hasValue ? "" : `${fieldName} is required`);
      setIsValid(hasValue);
    } else {
      const hasValue = value.trim().length > 0;
      setError(hasValue ? "" : `${fieldName} is required`);
      setIsValid(hasValue);
    }
  }, [value, fieldName]);

  return { error, isValid };
}
