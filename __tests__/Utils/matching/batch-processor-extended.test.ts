/**
 * Comprehensive tests for Batch Matching Processor
 * Tests user grouping, similarity calculation, batch processing
 */

import { BatchMatchingProcessor } from '@/Utils/matching/batch-processor.service';

jest.mock('@/Utils/databasePool');
jest.mock('@/Utils/matching/embedding.service');
jest.mock('@/Utils/consolidatedMatching');

describe('Batch Matching Processor', () => {
  let processor: BatchMatchingProcessor;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    const { embeddingService } = require('@/Utils/matching/embedding.service');
    embeddingService.batchGenerateUserEmbeddings = jest.fn().mockResolvedValue(new Map());
    embeddingService.storeUserEmbedding = jest.fn().mockResolvedValue(undefined);

    processor = new BatchMatchingProcessor();
  });

  describe('processBatch', () => {
    it('should process batch of users', async () => {
      const users = [
        { email: 'user1@example.com', preferences: { target_cities: ['London'] } },
        { email: 'user2@example.com', preferences: { target_cities: ['Paris'] } }
      ];

      const jobs = [
        { id: 'job1', title: 'Engineer', location: 'London' },
        { id: 'job2', title: 'Designer', location: 'Paris' }
      ];

      const result = await processor.processBatch(users, jobs);

      expect(result).toBeInstanceOf(Map);
    });

    it('should use embeddings when enabled', async () => {
      const { embeddingService } = require('@/Utils/matching/embedding.service');
      embeddingService.batchGenerateUserEmbeddings.mockResolvedValue(
        new Map([
          ['user1@example.com', Array(1536).fill(0.1)],
          ['user2@example.com', Array(1536).fill(0.1)]
        ])
      );

      const users = [
        { email: 'user1@example.com', preferences: {} },
        { email: 'user2@example.com', preferences: {} }
      ];

      await processor.processBatch(users, [], { useEmbeddings: true });

      expect(embeddingService.batchGenerateUserEmbeddings).toHaveBeenCalled();
    });

    it('should fallback to heuristics when embeddings disabled', async () => {
      const users = [
        { email: 'user1@example.com', preferences: { target_cities: ['London'] } }
      ];

      await processor.processBatch(users, [], { useEmbeddings: false });

      const { embeddingService } = require('@/Utils/matching/embedding.service');
      expect(embeddingService.batchGenerateUserEmbeddings).not.toHaveBeenCalled();
    });
  });

  describe('groupUsersBySimilarity', () => {
    it('should group users by embedding similarity', async () => {
      const { embeddingService } = require('@/Utils/matching/embedding.service');
      embeddingService.batchGenerateUserEmbeddings.mockResolvedValue(
        new Map([
          ['user1@example.com', Array(1536).fill(0.1)],
          ['user2@example.com', Array(1536).fill(0.1)]
        ])
      );

      const users = [
        { email: 'user1@example.com', preferences: {} },
        { email: 'user2@example.com', preferences: {} }
      ];

      const result = await processor.processBatch(users, [], { useEmbeddings: true });

      expect(result).toBeDefined();
    });

    it('should group users by heuristics when embeddings unavailable', async () => {
      const { embeddingService } = require('@/Utils/matching/embedding.service');
      embeddingService.batchGenerateUserEmbeddings.mockResolvedValue(new Map());

      const users = [
        { email: 'user1@example.com', preferences: { target_cities: ['London'], career_path: ['strategy'] } },
        { email: 'user2@example.com', preferences: { target_cities: ['London'], career_path: ['strategy'] } }
      ];

      const result = await processor.processBatch(users, [], { useEmbeddings: true });

      expect(result).toBeDefined();
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const processor = new BatchMatchingProcessor();
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];

      const similarity = (processor as any).cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(1.0);
    });

    it('should return 0 for orthogonal vectors', () => {
      const processor = new BatchMatchingProcessor();
      const vec1 = [1, 0];
      const vec2 = [0, 1];

      const similarity = (processor as any).cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(0);
    });
  });
});

