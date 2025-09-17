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

    const treeStructure = conversation.getTreeStructure();
    
    res.json({
      conversation: {
        ...conversation.toObject(),
        treeStructure
      }
    });
  } catch (error) {
    console.error('Get shared conversation error:', error);
    res.status(500).json({ error: 'Failed to get shared conversation' });
  }
});

module.exports = router;
