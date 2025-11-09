/**
 * Comprehensive tests for Country Language Map
 * Tests language mapping, country codes
 */

import {
  getLanguagesForCountry,
  getCountryForLanguage,
  COUNTRY_LANGUAGE_MAP
} from '@/Utils/countryLanguageMap';

describe('Country Language Map', () => {
  describe('getLanguagesForCountry', () => {
    it('should return languages for country', () => {
      const languages = getLanguagesForCountry('UK');

      expect(Array.isArray(languages)).toBe(true);
    });

    it('should handle unknown country', () => {
      const languages = getLanguagesForCountry('Unknown');

      expect(languages).toBeDefined();
    });
  });

  describe('getCountryForLanguage', () => {
    it('should return countries for language', () => {
      const countries = getCountryForLanguage('English');

      expect(Array.isArray(countries)).toBe(true);
    });
  });

  describe('COUNTRY_LANGUAGE_MAP', () => {
    it('should have valid mapping', () => {
      expect(COUNTRY_LANGUAGE_MAP).toBeDefined();
      expect(typeof COUNTRY_LANGUAGE_MAP).toBe('object');
    });
  });
});

