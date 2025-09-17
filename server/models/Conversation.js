const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    trim: true,
    default: null
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  response: {
    type: String,
    required: true
  },
  selectedText: {
    type: String,
    default: null
  },
  parentId: {
    type: String,
    default: null
  },
  children: [{
    type: String,
    ref: 'Node'
  }],
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  metadata: {
    apiProvider: {
      type: String,
      enum: ['lmstudio', 'openai', 'google', 'groq', 'openrouter'],
      default: 'lmstudio'
    },
    model: {
      type: String,
      default: 'gpt-3.5-turbo'
    },
    tokens: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const conversationSchema = new mongoose.Schema({
  __v: { type: Number, default: 0 }, // Version key for optimistic locking
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rootNodeId: {
    type: String,
    required: true
  },
  nodes: [nodeSchema],
  settings: {
    layout: {
      type: String,
      enum: ['hierarchical', 'force-directed', 'radial'],
      default: 'hierarchical'
    },
    autoLayout: {
      type: Boolean,
      default: true
    },
    showFullResponses: {
      type: Boolean,
      default: false
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ shareToken: 1 });
conversationSchema.index({ tags: 1 });

// Virtual for node count
conversationSchema.virtual('nodeCount').get(function() {
  return this.nodes.length;
});

// Method to get node by ID
conversationSchema.methods.getNodeById = function(nodeId) {
  return this.nodes.find(node => node.id === nodeId);
};

// Method to add child node
conversationSchema.methods.addChildNode = function(parentId, newNode) {
  const parentNode = this.getNodeById(parentId);
  if (parentNode) {
    parentNode.children.push(newNode.id);
    this.nodes.push(newNode);
    this.lastModified = new Date();
    return true;
  }
  return false;
};

// Method to delete node and its descendants
conversationSchema.methods.deleteNode = function(nodeId) {
  const nodeToDelete = this.getNodeById(nodeId);
  if (!nodeToDelete) {
    return false;
  }

  // Get all descendant node IDs (recursive)
  const descendantIds = new Set();
  const getDescendants = (nodeId) => {
    const node = this.getNodeById(nodeId);
    if (node) {
      descendantIds.add(nodeId);
      node.children.forEach(childId => getDescendants(childId));
    }
  };
  getDescendants(nodeId);

  // Remove the node from its parent's children array
  if (nodeToDelete.parentId) {
    const parentNode = this.getNodeById(nodeToDelete.parentId);
    if (parentNode) {
      parentNode.children = parentNode.children.filter(id => id !== nodeId);
    }
  }

  // Remove all descendant nodes
  this.nodes = this.nodes.filter(node => !descendantIds.has(node.id));
  
  this.lastModified = new Date();
  return true;
};

// Method to get tree structure
conversationSchema.methods.getTreeStructure = function() {
  const nodeMap = new Map();
  const rootNodes = [];

  // Create a map of all nodes
  this.nodes.forEach(node => {
    nodeMap.set(node.id, {
      ...node.toObject(),
      children: []
    });
  });

  // Build the tree structure
  this.nodes.forEach(node => {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(nodeMap.get(node.id));
      }
    } else {
      rootNodes.push(nodeMap.get(node.id));
    }
  });

  return rootNodes;
};

module.exports = mongoose.model('Conversation', conversationSchema);
