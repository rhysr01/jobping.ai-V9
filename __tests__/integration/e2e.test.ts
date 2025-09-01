/**
 * End-to-End Integration Tests (continued)
 */
      expect(data.checks.database.status).toBe('unhealthy');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});

export {};
