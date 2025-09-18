/* ============================
   JobPing Legacy Compatibility Layer
   
   This file now serves as a compatibility layer for the refactored
   matching system. All functionality has been moved to focused modules
   in the Utils/matching/ directory.
   
   DEPRECATED: Use Utils/matching/ modules directly
   ============================ */

// Re-export everything from the new modular system
export * from './matching';