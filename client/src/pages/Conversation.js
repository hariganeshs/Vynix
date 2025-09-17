import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Settings, 
  Plus, 
  ArrowLeft, 
  Share2, 
  Download,
  Zap,
  Brain,
  Globe,
  Server,
  MessageSquare
} from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';
import toast from 'react-hot-toast';
import ConversationTree from '../components/ConversationTree';
import LoadingSpinner from '../components/LoadingSpinner';
// import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import api from '../services/api';

const Conversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingParentId, setPendingParentId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('google');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [treeLayout, setTreeLayout] = useState('vertical'); // 'horizontal' or 'vertical'
  const [focusNodeId, setFocusNodeId] = useState(null);

  // ReactFlow selection propagation with guard (commented out for now)
  // const handleFlowSelectionChange = useCallback((nodeIds) => {
  //   setSelectedNodes((prev) => {
  //     if (prev.length === nodeIds.length) {
  //       const prevSet = new Set(prev);
  //       let allSame = true;
  //       for (const id of nodeIds) {
  //         if (!prevSet.has(id)) { allSame = false; break; }
  //       }
  //       if (allSame) return prev; // no change
  //     }
  //     return [...nodeIds];
  //   });
  // }, []);

  // Load conversation
  useEffect(() => {
    console.log('Conversation useEffect - id:', id);
    
    const loadConversation = async () => {
      try {
        setLoading(true);
        console.log('Loading conversation with ID:', id);
        const response = await api.get(`/conversations/${id}`);
        setConversation(response.data.conversation);
      } catch (error) {
        console.error('Failed to load conversation:', error);
        toast.error('Failed to load conversation');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (id && id !== 'new') {
      loadConversation();
    } else if (id === 'new') {
      console.log('Setting up new conversation interface');
      setConversation(null); // Ensure conversation is null for new conversations
      setLoading(false);
    } else {
      console.log('No ID provided, setting up new conversation interface');
      setConversation(null);
      setLoading(false);
    }
  }, [id, navigate]);

  // Handle new conversation creation
  const handleNewConversation = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      setSending(true);
      console.log('Creating conversation with:', {
        title: prompt.substring(0, 50) + '...',
        prompt: prompt.trim(),
        provider: selectedProvider,
        model: selectedModel
      });
      
      const response = await api.post('/conversations', {
        title: prompt.substring(0, 50) + '...',
        prompt: prompt.trim(),
        provider: selectedProvider,
        model: selectedModel
      });

      console.log('Conversation created successfully:', response.data);
      const newConversation = response.data.conversation;
      setConversation(newConversation);
      setPrompt('');
      toast.success('Conversation created!');
      
      // Focus on the root node of the new conversation
      if (newConversation.rootNodeId) {
        setSelectedNodes([newConversation.rootNodeId]);
        setFocusNodeId(newConversation.rootNodeId);
        setTimeout(() => setFocusNodeId(null), 1000);
      }
      
      // Navigate to the new conversation
      navigate(`/conversation/${newConversation._id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to create conversation: ${error.response?.data?.error || error.message}`);
    } finally {
      setSending(false);
    }
  }, [prompt, selectedProvider, selectedModel, navigate]);

  // Handle branching
  const handleBranch = useCallback(async (parentId, selectedText, branchPrompt = null) => {
    const promptToUse = branchPrompt || prompt.trim();
    
    if (!promptToUse) {
      toast.error('Please enter a title for the branch');
      return;
    }

    try {
      setSending(true);
      setPendingParentId(parentId);
      const response = await api.post(`/conversations/${id}/branches`, {
        parentId,
        selectedText,
        prompt: promptToUse,
        provider: selectedProvider,
        model: selectedModel
      });

      const updated = response.data.conversation;
      setConversation(updated);
      setPrompt('');
      toast.success('Branch created!');

      // Auto-focus the newly created child (first new child at end of parent's children array)
      try {
        const parent = updated.nodes?.find(n => n.id === parentId);
        const lastChildId = parent?.children?.[parent.children.length - 1];
        if (lastChildId) {
          setSelectedNodes([lastChildId]);
          setFocusNodeId(lastChildId);
          // Clear focus after a delay to allow the focus to take effect
          setTimeout(() => setFocusNodeId(null), 1000);
        }
      } catch {}
    } catch (error) {
      console.error('Failed to create branch:', error);
      toast.error('Failed to create branch');
    } finally {
      setSending(false);
      setPendingParentId(null);
    }
  }, [id, prompt, selectedProvider, selectedModel]);

  // Handle node deletion
  const handleDeleteNode = useCallback(async (nodeId) => {
    if (!conversation) return;

    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this node and all its descendants? This action cannot be undone.')) {
      return;
    }

    try {
      setSending(true);
      const response = await api.delete(`/conversations/${id}/nodes/${nodeId}`);

      setConversation(response.data.conversation);
      setSelectedNodes(prev => prev.filter(id => id !== nodeId));
      toast.success('Node deleted successfully!');
    } catch (error) {
      console.error('Failed to delete node:', error);
      toast.error(error.response?.data?.error || 'Failed to delete node');
    } finally {
      setSending(false);
    }
  }, [id, conversation]);

  // Handle title editing
  const handleTitleEdit = useCallback(async (nodeId, newTitle) => {
    if (!conversation) return;

    try {
      setSending(true);
      const response = await api.patch(`/conversations/${id}/nodes/${nodeId}/title`, {
        title: newTitle
      });

      setConversation(response.data.conversation);
      toast.success('Title updated successfully!');
    } catch (error) {
      console.error('Failed to update title:', error);
      toast.error(error.response?.data?.error || 'Failed to update title');
    } finally {
      setSending(false);
    }
  }, [id, conversation]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId, isMultiSelect = false) => {
    console.log('Node selected:', nodeId, 'isMultiSelect:', isMultiSelect);
    
    if (nodeId === null) {
      // Handle deselection
      setSelectedNodes([]);
    } else {
      setSelectedNodes(prev => {
        if (isMultiSelect) {
          // Multi-select mode: toggle the node
          if (prev.includes(nodeId)) {
            return prev.filter(id => id !== nodeId);
          } else {
            return [...prev, nodeId];
          }
        } else {
          // Single-select mode: replace selection with this node only
          return [nodeId];
        }
      });
    }
  }, []);

  // API Providers configuration
  const apiProviders = [
    { id: 'lmstudio', name: 'LM Studio', icon: Brain, description: 'Local AI (127.0.0.1:1234)' },
    { id: 'openai', name: 'OpenAI', icon: Zap, description: 'GPT-3.5/4 Models' },
    { id: 'google', name: 'Google AI', icon: Globe, description: 'Gemini Models' },
    { id: 'groq', name: 'Groq', icon: Server, description: 'Fast Inference' },
    { id: 'openrouter', name: 'OpenRouter', icon: MessageSquare, description: 'Free AI Models' }
  ];

  const models = {
    lmstudio: ['gpt-3.5-turbo', 'gpt-4', 'llama-2-7b', 'llama-2-13b', 'openai/gpt-oss-20b'],
    openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    google: [
      'gemini-1.5-flash',      // Cheapest, fastest
      'gemini-1.5-flash-exp',  // Experimental version
      'gemini-2.0-flash',      // Newer, still cost-effective
      'gemini-1.5-pro',        // More capable, higher cost
      'gemini-1.0-pro',        // Legacy
      'gemini-pro'             // Original
    ],
    groq: ['llama2-70b-4096', 'mixtral-8x7b-32768', 'gemma-7b-it'],
    openrouter: [
      // Free models available on OpenRouter
      'openai/gpt-oss-20b:free',
      'z-ai/glm-4.5-air:free',
      'qwen/qwen3-coder:free',
      'moonshotai/kimi-k2:free',
      'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
      'google/gemma-3n-e2b-it:free'
    ]
  };

  // Set default models based on provider
  React.useEffect(() => {
    if (selectedProvider === 'lmstudio') {
      setSelectedModel('openai/gpt-oss-20b');
    } else if (selectedProvider === 'google') {
      setSelectedModel('gemini-1.5-flash'); // Default option
    } else if (selectedProvider === 'openrouter') {
      setSelectedModel('openai/gpt-oss-20b:free'); // Popular free model
    }
  }, [selectedProvider]);

  console.log('Conversation component render - loading:', loading, 'conversation:', conversation);
  
  if (loading) {
    console.log('Showing loading spinner');
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary-50 to-accent-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between p-4 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
              {conversation?.title || 'New Conversation'}
            </h1>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              {conversation?.nodes?.length || 0} nodes • {conversation?.createdAt ? new Date(conversation.createdAt).toLocaleDateString() : 'Just now'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors"
            title="Export"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <AnimatePresence>
          {showSettings && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white/90 dark:bg-secondary-900/90 backdrop-blur-sm border-r border-secondary-200 dark:border-secondary-700 overflow-hidden"
            >
              <div className="p-4 space-y-6">
                {/* API Provider Selection */}
                <div>
                  <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                    AI Provider
                  </h3>
                  <div className="space-y-2">
                    {apiProviders.map(provider => {
                      const Icon = provider.icon;
                      return (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedProvider(provider.id)}
                          className={cn(
                            "w-full flex items-center space-x-3 p-3 rounded-lg border transition-all",
                            selectedProvider === provider.id
                              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                              : "border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600"
                          )}
                        >
                          <Icon className="w-4 h-4 text-primary-600" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                              {provider.name}
                            </div>
                            <div className="text-xs text-secondary-500 dark:text-secondary-400">
                              {provider.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                    Model
                  </h3>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2 border border-secondary-200 dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 text-sm"
                  >
                    {models[selectedProvider]?.map(model => {
                      let displayName = model;
                      
                      // Clean up model names for display
                      if (selectedProvider === 'google') {
                        displayName = model.replace('gemini-', '');
                      }
                      
                      return (
                        <option key={model} value={model}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Tree Layout Selection */}
                <div>
                  <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                    Tree Layout
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setTreeLayout('horizontal')}
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 rounded-lg border transition-all",
                        treeLayout === 'horizontal'
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600"
                      )}
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-3 h-2 bg-current rounded-sm"></div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                          Horizontal
                        </div>
                        <div className="text-xs text-secondary-500 dark:text-secondary-400">
                          Left to right Layout
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setTreeLayout('vertical')}
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 rounded-lg border transition-all",
                        treeLayout === 'vertical'
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600"
                      )}
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-2 h-3 bg-current rounded-sm"></div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                          Vertical
                        </div>
                        <div className="text-xs text-secondary-500 dark:text-secondary-400">
                          Top to bottom Layout
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Conversation Info */}
                {conversation && (
                  <div>
                    <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                      Conversation Info
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-secondary-500 dark:text-secondary-400">Nodes:</span>
                        <span className="text-secondary-900 dark:text-secondary-100">{conversation.nodes?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-500 dark:text-secondary-400">Created:</span>
                        <span className="text-secondary-900 dark:text-secondary-100">
                          {new Date(conversation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-500 dark:text-secondary-400">Modified:</span>
                        <span className="text-secondary-900 dark:text-secondary-100">
                          {new Date(conversation.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Tree Visualization */}
          <div className="flex-1 relative">
            {conversation ? (
              <ReactFlowProvider>
                <ConversationTree
                  conversation={conversation}
                  onBranch={handleBranch}
                  onNodeSelect={handleNodeSelect}
                  onDeleteNode={handleDeleteNode}
                  onTitleEdit={handleTitleEdit}
                  selectedNodes={selectedNodes}
                  layout={treeLayout}
                  focusNodeId={focusNodeId}
                  isSending={sending}
                  pendingParentId={pendingParentId}
                />
              </ReactFlowProvider>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    Start Your Conversation
                  </h3>
                  <p className="text-secondary-500 dark:text-secondary-400">
                    Enter a prompt below to begin your AI-powered conversation
                  </p>
                </div>
              </div>
            )}


          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-t border-secondary-200 dark:border-secondary-700 sticky bottom-0 z-10">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={conversation ? "Select a node and enter prompt..." : "Start a new conversation..."}
                  className="w-full p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (conversation) {
                        // For existing conversation, we need a selected node to branch from
                        if (selectedNodes.length === 0) {
                          toast.error('Please select a node to branch from');
                          return;
                        }
                        handleBranch(selectedNodes[0], '');
                      } else {
                        handleNewConversation();
                      }
                    }
                  }}
                />
              </div>
              <button
                onClick={conversation ? () => {
                  if (selectedNodes.length === 0) {
                    toast.error('Please select a node to branch from');
                    return;
                  }
                  handleBranch(selectedNodes[0], '');
                } : handleNewConversation}
                disabled={sending || !prompt.trim()}
                className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <LoadingSpinner size="sm" />
                ) : conversation ? (
                  <Plus className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {conversation && selectedNodes.length === 0 && (
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-2">
                Select a node in the tree to create a branch from it, or select text in a node to branch from that specific content
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
