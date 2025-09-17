const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get all conversations for user
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.id })
      .select('title description createdAt lastModified nodeCount tags')
      .sort({ lastModified: -1 });
    
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get single conversation with tree structure
router.get('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const treeStructure = conversation.getTreeStructure();
    
    res.json({
      conversation: {
        ...conversation.toObject(),
        treeStructure
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Create new conversation
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating conversation with body:', req.body);
    const { title, prompt, provider = 'lmstudio', model = null } = req.body;
    
    if (!title || !prompt) {
      return res.status(400).json({ error: 'Title and prompt are required' });
    }

    console.log('Generating AI response for prompt:', prompt);
    // Generate AI response for the initial prompt
    const aiResponse = await aiService.generateResponse(prompt, provider, model);
    console.log('AI response received:', aiResponse);
    
    // Create root node
    const rootNodeId = uuidv4();
    const rootNode = {
      id: rootNodeId,
      title: title,
      prompt,
      response: aiResponse.content,
      parentId: null,
      children: [],
      position: { x: 0, y: 0 },
      metadata: {
        apiProvider: provider,
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        responseTime: aiResponse.responseTime
      }
    };

    // Create conversation
    const conversation = new Conversation({
      title,
      userId: req.user.id,
      rootNodeId,
      nodes: [rootNode]
    });

    await conversation.save();
    
    res.status(201).json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        treeStructure: conversation.getTreeStructure()
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to create conversation',
      message: error.message 
    });
  }
});

// Test AI connection
router.get('/test-ai', auth, async (req, res) => {
  try {
    const { provider = 'lmstudio', model = 'gpt-oss-20b' } = req.query;
    
    console.log(`Testing AI connection: ${provider} with model ${model}`);
    
    const testResponse = await aiService.generateResponse(
      'Hello! Please respond with a short test message to verify the connection is working.',
      provider,
      model
    );
    
    res.json({
      success: true,
      provider,
      model,
      response: testResponse.content,
      responseTime: testResponse.responseTime
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({
      error: 'AI connection test failed',
      message: error.message,
      provider: req.query.provider || 'lmstudio'
    });
  }
});

// Add branch to conversation
router.post('/:id/branches', auth, async (req, res) => {
  try {
    const { parentId, selectedText, prompt, provider = 'lmstudio', model = null } = req.body;
    
    if (!parentId || !prompt) {
      return res.status(400).json({ error: 'Parent ID and prompt are required' });
    }

    let conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get parent node for context
    const parentNode = conversation.getNodeById(parentId);
    if (!parentNode) {
      return res.status(404).json({ error: 'Parent node not found' });
    }

    // Generate AI response with enhanced context
    const context = [
      { role: 'user', content: parentNode.prompt },
      { role: 'assistant', content: parentNode.response }
    ];
    
    // If there's selected text, enhance the prompt with context
    let enhancedPrompt = prompt;
    if (selectedText && selectedText.trim()) {
      enhancedPrompt = `Based on the previous response, please elaborate on this specific aspect: "${selectedText.trim()}"\n\nOriginal prompt: ${prompt}`;
    }
    
    const aiResponse = await aiService.generateResponse(enhancedPrompt, provider, model, context);
    
    // Create new node
    const newNodeId = uuidv4();
    const newNode = {
      id: newNodeId,
      title: selectedText && selectedText.trim() ? selectedText.trim() : null,
      prompt: selectedText && selectedText.trim() ? selectedText.trim() : prompt.trim(),
      response: aiResponse.content,
      selectedText,
      parentId,
      children: [],
      position: { x: 0, y: 0 },
      metadata: {
        apiProvider: provider,
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        responseTime: aiResponse.responseTime
      }
    };

    // Add to conversation with retry logic for version conflicts
    let retries = 3;
    while (retries > 0) {
      try {
        conversation.addChildNode(parentId, newNode);
        await conversation.save();
        break;
      } catch (error) {
        if (error.name === 'VersionError' && retries > 1) {
          // Reload the conversation and retry
          conversation = await Conversation.findOne({
            _id: req.params.id,
            userId: req.user.id
          });
          if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
          }
          retries--;
        } else {
          throw error;
        }
      }
    }
    
    res.json({
      success: true,
      node: newNode,
      conversation: {
        ...conversation.toObject(),
        treeStructure: conversation.getTreeStructure()
      }
    });
  } catch (error) {
    console.error('Add branch error:', error);
    res.status(500).json({ 
      error: 'Failed to add branch',
      message: error.message 
    });
  }
});

// Update node title
router.patch('/:id/nodes/:nodeId/title', auth, async (req, res) => {
  try {
    const { id, nodeId } = req.params;
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let conversation = await Conversation.findOne({
      _id: id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const node = conversation.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Update the node's title
    node.title = title.trim();
    conversation.lastModified = new Date();

    // Save with retry logic for version conflicts
    let retries = 3;
    while (retries > 0) {
      try {
        await conversation.save();
        break;
      } catch (error) {
        if (error.name === 'VersionError' && retries > 1) {
          // Reload the conversation and retry
          conversation = await Conversation.findOne({
            _id: id,
            userId: req.user.id
          });
          if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
          }
          retries--;
        } else {
          throw error;
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Node title updated successfully',
      conversation: {
        ...conversation.toObject(),
        treeStructure: conversation.getTreeStructure()
      }
    });
  } catch (error) {
    console.error('Update node title error:', error);
    res.status(500).json({ 
      error: 'Failed to update node title',
      message: error.message 
    });
  }
});

// Delete node from conversation
router.delete('/:id/nodes/:nodeId', auth, async (req, res) => {
  try {
    const { id, nodeId } = req.params;
    
    let conversation = await Conversation.findOne({
      _id: id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if trying to delete root node
    if (nodeId === conversation.rootNodeId) {
      return res.status(400).json({ error: 'Cannot delete the root node' });
    }

    const success = conversation.deleteNode(nodeId);
    if (!success) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Save with retry logic for version conflicts
    let retries = 3;
    while (retries > 0) {
      try {
        await conversation.save();
        break;
      } catch (error) {
        if (error.name === 'VersionError' && retries > 1) {
          // Reload the conversation and retry
          conversation = await Conversation.findOne({
            _id: id,
            userId: req.user.id
          });
          if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
          }
          retries--;
        } else {
          throw error;
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Node deleted successfully',
      conversation: {
        ...conversation.toObject(),
        treeStructure: conversation.getTreeStructure()
      }
    });
  } catch (error) {
    console.error('Delete node error:', error);
    res.status(500).json({ 
      error: 'Failed to delete node',
      message: error.message 
    });
  }
});

// Update conversation settings
router.patch('/:id/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        $set: { 
          settings: { ...settings },
          lastModified: new Date()
        }
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        treeStructure: conversation.getTreeStructure()
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Delete conversation
router.delete('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Get shared conversation (public)
router.get('/shared/:token', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      shareToken: req.params.token,
      isPublic: true
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Shared conversation not found' });
    }

    // Apply content safety filtering for public viewing
    const sanitizedConversation = req.contentSafety.sanitizeConversation(conversation.toObject());
    const treeStructure = conversation.getTreeStructure();
    
    res.json({
      conversation: {
        ...sanitizedConversation,
        treeStructure
      }
    });
  } catch (error) {
    console.error('Get shared conversation error:', error);
    res.status(500).json({ error: 'Failed to get shared conversation' });
  }
});

// Export conversation
router.get('/:id/export', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Create export data
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      conversation: {
        title: conversation.title,
        description: conversation.description,
        nodes: conversation.nodes,
        rootNodeId: conversation.rootNodeId,
        createdAt: conversation.createdAt,
        lastModified: conversation.lastModified,
        settings: conversation.settings
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.json"`);
    
    res.json(exportData);
  } catch (error) {
    console.error('Export conversation error:', error);
    res.status(500).json({ error: 'Failed to export conversation' });
  }
});

// Import conversation
router.post('/import', auth, async (req, res) => {
  try {
    const { conversation: importData } = req.body;
    
    if (!importData || !importData.title || !importData.nodes) {
      return res.status(400).json({ error: 'Invalid conversation data' });
    }

    // Validate the imported data structure
    if (!Array.isArray(importData.nodes) || importData.nodes.length === 0) {
      return res.status(400).json({ error: 'Invalid nodes data' });
    }

    // Create new conversation from imported data
    const newConversation = new Conversation({
      title: importData.title,
      description: importData.description || '',
      userId: req.user.id,
      rootNodeId: importData.rootNodeId || importData.nodes[0]?.id,
      nodes: importData.nodes,
      settings: importData.settings || {}
    });

    await newConversation.save();
    
    res.status(201).json({
      success: true,
      conversation: {
        ...newConversation.toObject(),
        treeStructure: newConversation.getTreeStructure()
      }
    });
  } catch (error) {
    console.error('Import conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to import conversation',
      message: error.message 
    });
  }
});

// Share conversation (create share token)
router.post('/:id/share', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Generate share token if not exists
    if (!conversation.shareToken) {
      conversation.shareToken = uuidv4();
    }
    
    conversation.isPublic = true;
    conversation.lastModified = new Date();

    await conversation.save();

    const shareUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/share/${conversation.shareToken}`;
    
    res.json({
      success: true,
      shareToken: conversation.shareToken,
      shareUrl,
      message: 'Conversation is now public'
    });
  } catch (error) {
    console.error('Share conversation error:', error);
    res.status(500).json({ error: 'Failed to share conversation' });
  }
});

// Revoke share (remove share token)
router.delete('/:id/share', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.shareToken = null;
    conversation.isPublic = false;
    conversation.lastModified = new Date();

    await conversation.save();
    
    res.json({
      success: true,
      message: 'Conversation is no longer public'
    });
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

module.exports = router;
