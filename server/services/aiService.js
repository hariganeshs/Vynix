const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cacheService = require('./cache');

class AIService {
  constructor() {
    this.providers = {
      lmstudio: {
        baseURL: 'http://127.0.0.1:1234',
        endpoint: '/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      openai: {
        baseURL: 'https://api.openai.com',
        endpoint: '/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      },
      google: {
        baseURL: 'https://generativelanguage.googleapis.com',
        // endpoint will be composed with model at call time
        endpoint: '/v1beta/models',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      groq: {
        baseURL: 'https://api.groq.com',
        endpoint: '/openai/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        }
      },
      openrouter: {
        baseURL: 'https://openrouter.ai',
        endpoint: '/api/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://vynix.app',
          'X-Title': 'Vynix'
        }
      }
    };
  }

  async generateResponse(prompt, provider = 'lmstudio', model = null, context = []) {
    const startTime = Date.now();
    
    try {
      // Check FREE_MODE restrictions
      if (process.env.FREE_MODE === 'true' && !['lmstudio', 'openrouter'].includes(provider)) {
        throw new Error(`Provider ${provider} is not available in FREE_MODE. Only LM Studio and OpenRouter free models are allowed.`);
      }
      
      // For OpenRouter in FREE_MODE, ensure only free models are used
      if (process.env.FREE_MODE === 'true' && provider === 'openrouter' && model && !model.includes(':free')) {
        throw new Error(`Model ${model} is not free. Only models ending with ':free' are allowed in FREE_MODE.`);
      }
      
      // Check cache first
      const cachedResponse = cacheService.get(provider, model, prompt, context);
      if (cachedResponse) {
        console.log('Returning cached response');
        return {
          ...cachedResponse,
          responseTime: Date.now() - startTime,
          cached: true
        };
      }
      
      const providerConfig = this.providers[provider];
      if (!providerConfig) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      let response;
      switch (provider) {
        case 'lmstudio':
        case 'openai':
        case 'groq':
        case 'openrouter':
          response = await this.callOpenAICompatibleAPI(prompt, providerConfig, model, context);
          break;
        case 'google':
          response = await this.callGoogleAI(prompt, providerConfig, model, context);
          break;
        default:
          throw new Error(`Provider ${provider} not implemented`);
      }

      const responseTime = Date.now() - startTime;
      
      const result = {
        id: uuidv4(),
        content: response.content,
        tokens: response.tokens || 0,
        responseTime,
        provider,
        model: response.model || model || 'default',
        cached: false
      };

      // Cache the successful response
      cacheService.set(provider, model, prompt, context, result);
      
      return result;

    } catch (error) {
      console.error(`AI Service Error (${provider}):`, error.message);
      
      // For LM Studio, provide a more helpful error message
      if (provider === 'lmstudio') {
        console.error('LM Studio connection failed. Please check:');
        console.error('1. LM Studio is running on http://127.0.0.1:1234');
        console.error('2. The model "openai/gpt-oss-20b" is loaded');
        console.error('3. The model is ready to generate responses');
        throw new Error(`LM Studio connection failed: ${error.message}. Please ensure LM Studio is running and the model is loaded.`);
      }
      
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  async callOpenAICompatibleAPI(prompt, config, model, context) {
    const messages = [
      ...context.map(msg => ({
        role: msg.role || 'user',
        content: msg.content
      })),
      {
        role: 'user',
        content: prompt
      }
    ];

    // Default model selection
    const defaultModel = config.baseURL.includes('127.0.0.1') ? 'openai/gpt-oss-20b' : 'gpt-3.5-turbo';
    const selectedModel = model || defaultModel;

    console.log(`Calling AI API: ${config.baseURL}${config.endpoint}`);
    console.log(`Model: ${selectedModel}`);
    console.log(`Provider: ${config.baseURL.includes('127.0.0.1') ? 'LM Studio' : 'OpenAI/Groq'}`);

    // Configure max tokens based on provider
    let maxTokens = 1000; // Default
    if (config.baseURL.includes('openrouter.ai')) {
      // OpenRouter specific settings
      maxTokens = 2048; // Higher limit for OpenRouter models
    } else if (config.baseURL.includes('127.0.0.1')) {
      // LM Studio settings
      maxTokens = 1000;
    } else {
      // OpenAI/Groq settings
      maxTokens = 1000;
    }

    const requestBody = {
      model: selectedModel,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false
    };

    try {
      const response = await axios.post(
        `${config.baseURL}${config.endpoint}`,
        requestBody,
        {
          headers: config.headers,
          timeout: 120000 // Increased to 2 minutes for large models
        }
      );

      console.log('AI API Response received successfully');
      console.log('Response model:', response.data.model);
      console.log('Response content length:', response.data.choices[0]?.message?.content?.length || 0);
      
      // Check for empty response content
      const content = response.data.choices[0]?.message?.content;
      if (!content || content.trim() === '') {
        console.error('Empty response content received from AI API');
        console.log('Full response data:', JSON.stringify(response.data, null, 2));
        throw new Error('AI API returned empty response content');
      }

      return {
        content: content,
        tokens: response.data.usage?.total_tokens || 0,
        model: response.data.model
      };
    } catch (error) {
      console.error('AI API call failed:', error.message);
      throw error;
    }
  }

  async callGoogleAI(prompt, config, model, context) {
    const contents = [
      ...context.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    const requestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    };

    // Choose cheapest sensible default unless explicitly provided
    // gemini-1.5-flash is the most cost-effective option
    const selectedModel = model || process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash';

    // Fix the URL format for Google AI API
    const url = `${config.baseURL}/v1beta/models/${selectedModel}:generateContent?key=${process.env.GOOGLE_AI_KEY}`;

    console.log('Calling Google AI API:', url);
    console.log('Model:', selectedModel);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await axios.post(url, requestBody, {
        headers: config.headers,
        timeout: 60000
      });

      console.log('Google AI Response:', JSON.stringify(response.data, null, 2));

      return {
        content: response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '',
        tokens: response.data?.usageMetadata?.totalTokenCount || 0,
        model: selectedModel
      };
    } catch (err) {
      const detail = err.response?.data || err.message;
      console.error('Google AI error detail:', JSON.stringify(detail, null, 2));
      throw new Error(typeof detail === 'string' ? detail : (detail.error?.message || 'Google AI request failed'));
    }
  }

  async testConnection(provider) {
    try {
      const testPrompt = "Hello, this is a connection test. Please respond with 'Connection successful' if you can see this message.";
      const response = await this.generateResponse(testPrompt, provider, null, []);
      return {
        success: true,
        response: response.content,
        provider
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider
      };
    }
  }

  getAvailableProviders() {
    const allProviders = Object.keys(this.providers);
    
    // If FREE_MODE is enabled, only return free providers
    if (process.env.FREE_MODE === 'true') {
      return allProviders.filter(provider => ['lmstudio', 'openrouter'].includes(provider));
    }
    
    return allProviders;
  }

  getProviderConfig(provider) {
    return this.providers[provider] || null;
  }

  getModels(provider) {
    const allModels = {
      google: [
        'gemini-1.5-flash',      // Cheapest, fastest
        'gemini-1.5-flash-exp',  // Experimental version
        'gemini-2.0-flash',      // Newer, still cost-effective
        'gemini-1.5-pro',        // More capable, higher cost
        'gemini-1.0-pro',        // Legacy
        'gemini-pro'             // Original
      ],
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
      lmstudio: ['openai/gpt-oss-20b'],
      openrouter: [
        'openai/gpt-oss-20b:free',
        'z-ai/glm-4.5-air:free',
        'qwen/qwen3-coder:free',
        'moonshotai/kimi-k2:free',
        'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
        'google/gemma-3n-e2b-it:free'
      ]
    };

    const models = allModels[provider] || [];
    
    // If FREE_MODE is enabled, filter to only free models
    if (process.env.FREE_MODE === 'true') {
      if (provider === 'openrouter') {
        return models.filter(model => model.includes(':free'));
      }
      // For lmstudio, return all models as they're local/free
      if (provider === 'lmstudio') {
        return models;
      }
      // For other providers in FREE_MODE, return empty array
      return [];
    }
    
    return models;
  }
}

module.exports = new AIService();
