// Use a simple profanity filter instead of bad-words to avoid ES module issues
const profanityWords = [
  'damn', 'hell', 'crap', 'stupid', 'idiot', 'moron', 'fool',
  // Add more words as needed
];

class ContentSafetyService {
  constructor() {
    this.profanityWords = profanityWords;
    this.enabled = process.env.CONTENT_SAFETY_ENABLED !== 'false'; // Default enabled
  }

  // Sanitize text content
  sanitize(text) {
    if (!this.enabled || !text) return text;
    
    try {
      let sanitized = text;
      this.profanityWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        sanitized = sanitized.replace(regex, '*'.repeat(word.length));
      });
      return sanitized;
    } catch (error) {
      console.warn('Content safety filter error:', error);
      return text; // Return original text if filtering fails
    }
  }

  // Check if text contains inappropriate content
  isClean(text) {
    if (!this.enabled || !text) return true;
    
    try {
      const lowerText = text.toLowerCase();
      return !this.profanityWords.some(word => lowerText.includes(word.toLowerCase()));
    } catch (error) {
      console.warn('Content safety check error:', error);
      return true; // Assume clean if check fails
    }
  }

  // Get list of inappropriate words found
  getProfaneWords(text) {
    if (!this.enabled || !text) return [];
    
    try {
      const lowerText = text.toLowerCase();
      return this.profanityWords.filter(word => 
        lowerText.includes(word.toLowerCase())
      );
    } catch (error) {
      console.warn('Content safety word check error:', error);
      return [];
    }
  }

  // Sanitize conversation node content
  sanitizeNode(node) {
    if (!node) return node;

    const sanitizedNode = { ...node };
    
    if (node.prompt) {
      sanitizedNode.prompt = this.sanitize(node.prompt);
    }
    
    if (node.response) {
      sanitizedNode.response = this.sanitize(node.response);
    }
    
    if (node.title) {
      sanitizedNode.title = this.sanitize(node.title);
    }

    return sanitizedNode;
  }

  // Sanitize entire conversation for public viewing
  sanitizeConversation(conversation) {
    if (!conversation) return conversation;

    const sanitizedConversation = { ...conversation };
    
    // Sanitize title and description
    if (conversation.title) {
      sanitizedConversation.title = this.sanitize(conversation.title);
    }
    
    if (conversation.description) {
      sanitizedConversation.description = this.sanitize(conversation.description);
    }

    // Sanitize all nodes
    if (conversation.nodes && Array.isArray(conversation.nodes)) {
      sanitizedConversation.nodes = conversation.nodes.map(node => 
        this.sanitizeNode(node)
      );
    }

    return sanitizedConversation;
  }
}

// Create singleton instance
const contentSafetyService = new ContentSafetyService();

// Middleware function for Express
const contentSafetyMiddleware = (req, res, next) => {
  // Add content safety service to request object
  req.contentSafety = contentSafetyService;
  next();
};

module.exports = {
  contentSafetyService,
  contentSafetyMiddleware
};
