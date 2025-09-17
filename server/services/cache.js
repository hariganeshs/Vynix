const crypto = require('crypto');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.maxItems = parseInt(process.env.CACHE_MAX_ITEMS) || 500;
    this.ttl = parseInt(process.env.CACHE_TTL_MS) || 86400000; // 24 hours default
    this.disabled = process.env.CACHE_DISABLED === 'true';
  }

  // Generate cache key from request parameters
  generateKey(provider, model, prompt, contextHash) {
    const keyData = {
      provider,
      model,
      prompt: prompt.trim(),
      contextHash
    };
    
    const keyString = JSON.stringify(keyData);
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  // Generate context hash from conversation context
  generateContextHash(context) {
    if (!context || context.length === 0) {
      return 'empty';
    }
    
    const contextString = context.map(msg => 
      `${msg.role || 'user'}:${msg.content || ''}`
    ).join('|');
    
    return crypto.createHash('sha256').update(contextString).digest('hex').substring(0, 16);
  }

  // Get cached response
  get(provider, model, prompt, context = []) {
    if (this.disabled) {
      return null;
    }

    const contextHash = this.generateContextHash(context);
    const key = this.generateKey(provider, model, prompt, contextHash);
    
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache hit for key: ${key.substring(0, 16)}...`);
    return cached.data;
  }

  // Set cached response
  set(provider, model, prompt, context = [], response) {
    if (this.disabled) {
      return;
    }

    const contextHash = this.generateContextHash(context);
    const key = this.generateKey(provider, model, prompt, contextHash);
    
    // Normalize response data for caching
    const normalizedResponse = {
      id: response.id,
      content: response.content,
      tokens: response.tokens || 0,
      provider: response.provider,
      model: response.model || model
    };

    const cacheEntry = {
      data: normalizedResponse,
      timestamp: Date.now()
    };

    // If cache is at max capacity, remove oldest entry
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, cacheEntry);
    console.log(`Cached response for key: ${key.substring(0, 16)}...`);
  }

  // Clear all cache entries
  clear() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    // Count expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      maxItems: this.maxItems,
      ttl: this.ttl,
      disabled: this.disabled
    };
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Set up periodic cleanup (every hour)
setInterval(() => {
  cacheService.cleanup();
}, 60 * 60 * 1000);

module.exports = cacheService;
