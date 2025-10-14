/**
 * Tests for String Helpers
 * Comprehensive tests for string manipulation utilities
 */

import {
  normalizeStringToArray,
  truncate,
  capitalize,
  toKebabCase
} from '@/lib/string-helpers';

describe('String Helpers - normalizeStringToArray', () => {
  it('should handle null/undefined', () => {
    expect(normalizeStringToArray(null)).toEqual([]);
    expect(normalizeStringToArray(undefined)).toEqual([]);
  });

  it('should handle empty string', () => {
    expect(normalizeStringToArray('')).toEqual([]);
  });

  it('should handle single string', () => {
    expect(normalizeStringToArray('test')).toEqual(['test']);
  });

  it('should handle pipe-separated strings', () => {
    expect(normalizeStringToArray('tech|software|data')).toEqual(['tech', 'software', 'data']);
  });

  it('should handle comma-separated strings', () => {
    expect(normalizeStringToArray('tech, software, data')).toEqual(['tech', 'software', 'data']);
  });

  it('should trim whitespace from pipe-separated', () => {
    expect(normalizeStringToArray('tech | software | data')).toEqual(['tech', 'software', 'data']);
  });

  it('should trim whitespace from comma-separated', () => {
    expect(normalizeStringToArray('tech , software , data')).toEqual(['tech', 'software', 'data']);
  });

  it('should handle arrays', () => {
    expect(normalizeStringToArray(['tech', 'software'])).toEqual(['tech', 'software']);
  });

  it('should trim array elements', () => {
    expect(normalizeStringToArray(['  tech  ', '  software  '])).toEqual(['tech', 'software']);
  });

  it('should filter empty strings from arrays', () => {
    expect(normalizeStringToArray(['tech', '', 'software', '  '])).toEqual(['tech', 'software']);
  });

  it('should convert non-string array elements to strings', () => {
    expect(normalizeStringToArray([123, 'test', true])).toEqual(['123', 'test', 'true']);
  });

  it('should filter empty values after split', () => {
    expect(normalizeStringToArray('tech||software')).toEqual(['tech', 'software']);
  });

  it('should handle single value with trailing separator', () => {
    expect(normalizeStringToArray('tech|')).toEqual(['tech']);
  });

  it('should handle mixed whitespace', () => {
    expect(normalizeStringToArray('  tech  ')).toEqual(['tech']);
  });

  it('should handle non-string, non-array values', () => {
    expect(normalizeStringToArray(123)).toEqual([]);
    expect(normalizeStringToArray({})).toEqual([]);
  });
});

describe('String Helpers - truncate', () => {
  it('should not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long strings', () => {
    expect(truncate('hello world this is a test', 10)).toBe('hello w...');
  });

  it('should handle exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should add ellipsis', () => {
    const result = truncate('hello world', 8);
    expect(result).toBe('hello...');
    expect(result.length).toBe(8);
  });

  it('should handle very short maxLength', () => {
    expect(truncate('hello', 3)).toBe('...');
  });

  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('should preserve exactly maxLength characters', () => {
    const text = 'This is a long sentence';
    const result = truncate(text, 15);
    expect(result.length).toBe(15);
  });

  it('should handle unicode characters', () => {
    const result = truncate('Hello 世界 test', 10);
    expect(result.length).toBe(10);
  });

  it('should handle very long strings', () => {
    const longText = 'a'.repeat(1000);
    const result = truncate(longText, 50);
    expect(result.length).toBe(50);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('String Helpers - capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should handle single character', () => {
    expect(capitalize('h')).toBe('H');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('should only capitalize first letter', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });

  it('should handle all caps', () => {
    expect(capitalize('HELLO')).toBe('HELLO');
  });

  it('should handle numbers', () => {
    expect(capitalize('123abc')).toBe('123abc');
  });

  it('should handle special characters', () => {
    expect(capitalize('!hello')).toBe('!hello');
  });

  it('should handle whitespace', () => {
    expect(capitalize('  hello')).toBe('  hello');
  });
});

describe('String Helpers - toKebabCase', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(toKebabCase('helloWorld')).toBe('hello-world');
  });

  it('should convert PascalCase to kebab-case', () => {
    expect(toKebabCase('HelloWorld')).toBe('hello-world');
  });

  it('should handle spaces', () => {
    expect(toKebabCase('hello world')).toBe('hello-world');
  });

  it('should handle underscores', () => {
    expect(toKebabCase('hello_world')).toBe('hello-world');
  });

  it('should handle mixed formats', () => {
    expect(toKebabCase('helloWorld_test case')).toBe('hello-world-test-case');
  });

  it('should handle already kebab-case', () => {
    expect(toKebabCase('hello-world')).toBe('hello-world');
  });

  it('should handle single word', () => {
    expect(toKebabCase('hello')).toBe('hello');
  });

  it('should handle multiple consecutive capitals', () => {
    const result = toKebabCase('XMLHttpRequest');
    expect(result).toBe('xmlhttp-request');
  });

  it('should handle empty string', () => {
    expect(toKebabCase('')).toBe('');
  });

  it('should handle numbers', () => {
    const result = toKebabCase('hello123World');
    expect(result).toBe('hello123world');
  });

  it('should handle multiple spaces', () => {
    expect(toKebabCase('hello   world')).toBe('hello-world');
  });

  it('should handle multiple underscores', () => {
    expect(toKebabCase('hello___world')).toBe('hello-world');
  });

  it('should handle special characters', () => {
    expect(toKebabCase('hello@world')).toBe('hello@world');
  });

  it('should lowercase everything', () => {
    expect(toKebabCase('HELLO WORLD')).toBe('hello-world');
  });
});
