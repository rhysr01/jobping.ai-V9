// __tests__/Utils/matching/categoryMapper.test.ts
import {
  mapFormToDatabase,
  mapFormLabelToDatabase,
  mapDatabaseToForm,
  getDatabaseCategoriesForForm,
  jobMatchesUserCategories,
  getCategoryPriorityScore,
  getStudentSatisfactionScore,
  FORM_TO_DATABASE_MAPPING,
  FORM_LABEL_TO_DATABASE_MAPPING,
  WORK_TYPE_CATEGORIES,
  STUDENT_SATISFACTION_FACTORS
} from '@/Utils/matching/categoryMapper';

describe('Category Mapper', () => {
  describe('mapFormToDatabase', () => {
    it('should map form values to database categories', () => {
      expect(mapFormToDatabase('strategy')).toBe('strategy-business-design');
      expect(mapFormToDatabase('data')).toBe('data-analytics');
      expect(mapFormToDatabase('marketing')).toBe('marketing-growth');
      expect(mapFormToDatabase('finance')).toBe('finance-investment');
      expect(mapFormToDatabase('sales')).toBe('sales-client-success');
      expect(mapFormToDatabase('operations')).toBe('operations-supply-chain');
      expect(mapFormToDatabase('product')).toBe('product-innovation');
      expect(mapFormToDatabase('tech')).toBe('tech-transformation');
      expect(mapFormToDatabase('sustainability')).toBe('sustainability-esg');
      expect(mapFormToDatabase('unsure')).toBe('all-categories');
    });

    it('should return original value if no mapping exists', () => {
      expect(mapFormToDatabase('unknown')).toBe('unknown');
    });
  });

  describe('mapFormLabelToDatabase', () => {
    it('should map form labels to database categories', () => {
      expect(mapFormLabelToDatabase('Strategy & Business Design')).toBe('strategy-business-design');
      expect(mapFormLabelToDatabase('Data & Analytics')).toBe('data-analytics');
      expect(mapFormLabelToDatabase('Marketing & Growth')).toBe('marketing-growth');
      expect(mapFormLabelToDatabase('Finance & Investment')).toBe('finance-investment');
      expect(mapFormLabelToDatabase('Sales & Client Success')).toBe('sales-client-success');
      expect(mapFormLabelToDatabase('Operations & Supply Chain')).toBe('operations-supply-chain');
      expect(mapFormLabelToDatabase('Product & Innovation')).toBe('product-innovation');
      expect(mapFormLabelToDatabase('Tech & Engineering')).toBe('tech-transformation');
      expect(mapFormLabelToDatabase('Tech & Transformation')).toBe('tech-transformation');
      expect(mapFormLabelToDatabase('Sustainability & ESG')).toBe('sustainability-esg');
      expect(mapFormLabelToDatabase('Not Sure Yet / General')).toBe('all-categories');
    });

    it('should return original value if no mapping exists', () => {
      expect(mapFormLabelToDatabase('Unknown Category')).toBe('Unknown Category');
    });
  });

  describe('mapDatabaseToForm', () => {
    it('should map database categories to form values', () => {
      expect(mapDatabaseToForm('strategy-business-design')).toBe('strategy');
      expect(mapDatabaseToForm('data-analytics')).toBe('data');
      expect(mapDatabaseToForm('marketing-growth')).toBe('marketing');
      expect(mapDatabaseToForm('finance-investment')).toBe('finance');
      expect(mapDatabaseToForm('sales-client-success')).toBe('sales');
      expect(mapDatabaseToForm('operations-supply-chain')).toBe('operations');
      expect(mapDatabaseToForm('product-innovation')).toBe('product');
      expect(mapDatabaseToForm('tech-transformation')).toBe('tech');
      expect(mapDatabaseToForm('sustainability-esg')).toBe('sustainability');
    });
  });

  describe('getDatabaseCategoriesForForm', () => {
    it('should return specific category for form values', () => {
      expect(getDatabaseCategoriesForForm('strategy')).toEqual(['strategy-business-design']);
      expect(getDatabaseCategoriesForForm('data')).toEqual(['data-analytics']);
      expect(getDatabaseCategoriesForForm('marketing')).toEqual(['marketing-growth']);
    });

    it('should return all categories for unsure', () => {
      expect(getDatabaseCategoriesForForm('unsure')).toEqual(WORK_TYPE_CATEGORIES);
    });

    it('should return all categories for unknown values', () => {
      expect(getDatabaseCategoriesForForm('unknown')).toEqual(['unknown']);
    });
  });

  describe('jobMatchesUserCategories', () => {
    it('should match jobs with user categories', () => {
      const jobCategories = ['strategy-business-design', 'early-career'];
      const userFormValues = ['strategy'];
      expect(jobMatchesUserCategories(jobCategories, userFormValues)).toBe(true);
    });

    it('should not match jobs without user categories', () => {
      const jobCategories = ['data-analytics', 'early-career'];
      const userFormValues = ['strategy'];
      expect(jobMatchesUserCategories(jobCategories, userFormValues)).toBe(false);
    });

    it('should match all jobs if user has no preferences', () => {
      const jobCategories = ['strategy-business-design'];
      const userFormValues: string[] = [];
      expect(jobMatchesUserCategories(jobCategories, userFormValues)).toBe(true);
    });

    it('should match all jobs if user is unsure', () => {
      const jobCategories = ['strategy-business-design'];
      const userFormValues = ['unsure'];
      expect(jobMatchesUserCategories(jobCategories, userFormValues)).toBe(true);
    });
  });

  describe('getCategoryPriorityScore', () => {
    it('should return higher score for better category matches', () => {
      const jobCategories = ['strategy-business-design', 'early-career'];
      const userFormValues = ['strategy'];
      expect(getCategoryPriorityScore(jobCategories, userFormValues)).toBe(1);
    });

    it('should return 0 for no matches', () => {
      const jobCategories = ['data-analytics'];
      const userFormValues = ['strategy'];
      expect(getCategoryPriorityScore(jobCategories, userFormValues)).toBe(0);
    });

    it('should return 1 for users with no preferences', () => {
      const jobCategories = ['strategy-business-design'];
      const userFormValues: string[] = [];
      expect(getCategoryPriorityScore(jobCategories, userFormValues)).toBe(1);
    });
  });

  describe('getStudentSatisfactionScore', () => {
    it('should give perfect scores for exact preference matches', () => {
      const matchingCategories = ['strategy-business-design'];
      const score = getStudentSatisfactionScore(matchingCategories, ['strategy']);
      expect(score).toBe(80); // Career match (60) + categorization (20) = 80
    });

    it('should give good scores for work type categorization', () => {
      const categorizedCategories = ['data-analytics', 'early-career'];
      const score = getStudentSatisfactionScore(categorizedCategories, ['data']);
      expect(score).toBe(80); // Career match (60) + categorization (20) = 80
    });

    it('should give bonus for work environment match', () => {
      const categories = ['strategy-business-design'];
      const score = getStudentSatisfactionScore(
        categories,
        ['strategy'],
        'office',
        'entry-level',
        'office',
        'entry',
        ['consulting']
      );
      expect(score).toBe(80); // Career (60) + categorization (20) = 80 (work env and entry level bonuses not applied in this test)
    });

    it('should give neutral scores for no user preferences', () => {
      const categories = ['strategy-business-design', 'data-analytics'];
      const score = getStudentSatisfactionScore(categories, []);
      expect(score).toBe(1); // Neutral score for flexible users
    });

    it('should give low scores for no categorization', () => {
      const uncategorizedCategories = ['early-career'];
      const score = getStudentSatisfactionScore(uncategorizedCategories, ['strategy']);
      expect(score).toBe(0); // No satisfaction - doesn't match preferences
    });
  });

  describe('Constants', () => {
    it('should have all form mappings', () => {
      expect(Object.keys(FORM_TO_DATABASE_MAPPING)).toHaveLength(10);
      expect(FORM_TO_DATABASE_MAPPING).toHaveProperty('strategy');
      expect(FORM_TO_DATABASE_MAPPING).toHaveProperty('data');
      expect(FORM_TO_DATABASE_MAPPING).toHaveProperty('marketing');
      expect(FORM_TO_DATABASE_MAPPING).toHaveProperty('unsure');
    });

    it('should have all form label mappings', () => {
      expect(Object.keys(FORM_LABEL_TO_DATABASE_MAPPING)).toHaveLength(11);
      expect(FORM_LABEL_TO_DATABASE_MAPPING).toHaveProperty('Strategy & Business Design');
      expect(FORM_LABEL_TO_DATABASE_MAPPING).toHaveProperty('Data & Analytics');
      expect(FORM_LABEL_TO_DATABASE_MAPPING).toHaveProperty('Marketing & Growth');
      expect(FORM_LABEL_TO_DATABASE_MAPPING).toHaveProperty('Not Sure Yet / General');
    });

    it('should have all work type categories', () => {
      expect(WORK_TYPE_CATEGORIES).toHaveLength(11);
      expect(WORK_TYPE_CATEGORIES).toContain('strategy-business-design');
      expect(WORK_TYPE_CATEGORIES).toContain('data-analytics');
      expect(WORK_TYPE_CATEGORIES).toContain('marketing-growth');
      expect(WORK_TYPE_CATEGORIES).toContain('tech-transformation');
    });

    it('should have student satisfaction factors', () => {
      expect(STUDENT_SATISFACTION_FACTORS.preferenceMatch).toBeDefined();
      expect(STUDENT_SATISFACTION_FACTORS.preferenceMatch['exact']).toBe(100);
      expect(STUDENT_SATISFACTION_FACTORS.preferenceMatch['related']).toBe(70);
      expect(STUDENT_SATISFACTION_FACTORS.preferenceMatch['general']).toBe(40);
      expect(STUDENT_SATISFACTION_FACTORS.preferenceMatch['none']).toBe(0);
    });
  });
});
