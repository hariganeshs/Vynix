const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const cacheService = require('../services/cache');
const auth = require('../middleware/auth');

// Test AI provider connection
router.post('/test-connection', auth, async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    const result = await aiService.testConnection(provider);
    res.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Generate AI response
router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt, provider = 'lmstudio', model = null, context = [], parentId = null } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await aiService.generateResponse(prompt, provider, model, context);
    
    res.json({
      success: true,
      data: {
        ...response,
        parentId
      }
    });
  } catch (error) {
    console.error('Generate response error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      message: error.message 
    });
  }
});

// Get available providers
router.get('/providers', auth, (req, res) => {
  try {
    const providers = aiService.getAvailableProviders();
    const models = providers.reduce((acc, p) => {
      acc[p] = aiService.getModels(p);
      return acc;
    }, {});
    res.json({ providers, models });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Failed to get providers' });
  }
});

// Get provider configuration
router.get('/providers/:provider', auth, (req, res) => {
  try {
    const { provider } = req.params;
    const config = aiService.getProviderConfig(provider);
    
    if (!config) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Remove sensitive information
    const safeConfig = {
      baseURL: config.baseURL,
      endpoint: config.endpoint,
      hasAuth: !!config.headers.Authorization
    };

    res.json({ config: safeConfig });
  } catch (error) {
    console.error('Get provider config error:', error);
    res.status(500).json({ error: 'Failed to get provider configuration' });
  }
});

// Get cache statistics
router.get('/cache/stats', auth, (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// Clear cache
router.post('/cache/clear', auth, (req, res) => {
  try {
    cacheService.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
