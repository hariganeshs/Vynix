import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  Trash2, 
  Search,
  Grid,
  List,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AdSlot from '../components/AdSlot';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await api.delete(`/conversations/${id}`);
      setConversations(prev => prev.filter(conv => conv._id !== id));
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid JSON file');
      return;
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.conversation) {
        toast.error('Invalid conversation file format');
        return;
      }

      const response = await api.post('/conversations/import', {
        conversation: importData.conversation
      });

      setConversations(prev => [response.data.conversation, ...prev]);
      toast.success('Conversation imported successfully!');
      
      // Navigate to the imported conversation
      navigate(`/conversation/${response.data.conversation._id}`);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import conversation');
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return matchesSearch && new Date(conversation.lastModified) > oneWeekAgo;
    }
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2"
        >
          Welcome back, {user?.name}!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-secondary-600 dark:text-secondary-400"
        >
          Manage your AI conversations and explore new ideas
        </motion.p>
      </div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 mb-8"
      >
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary-200 dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-secondary-200 dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">All conversations</option>
          <option value="recent">Recent (last 7 days)</option>
        </select>

        {/* View Mode */}
        <div className="flex border border-secondary-200 dark:border-secondary-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Import Conversation */}
        <label className="btn btn-secondary px-6 py-2 cursor-pointer">
          <Upload className="w-4 h-4 mr-2" />
          Import
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>

        {/* New Conversation */}
        <button
          onClick={() => navigate('/conversation/new')}
          className="btn btn-primary px-6 py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </button>
      </motion.div>

      {/* Conversations */}
      <AnimatePresence mode="wait">
        {filteredConversations.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-12"
          >
            <MessageSquare className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
              No conversations yet
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-6">
              Start your first AI conversation to explore ideas with branching
            </p>
            <button
              onClick={() => navigate('/conversation/new')}
              className="btn btn-primary px-6 py-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Conversation
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="conversations"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}
          >
            {filteredConversations.map((conversation, index) => (
              <React.Fragment key={conversation._id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
                  }`}
                  onClick={() => navigate(`/conversation/${conversation._id}`)}
                >
                {viewMode === 'list' ? (
                  <>
                    <div className="flex-1">
                      <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-1">
                        {conversation.title}
                      </h3>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {conversation.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-secondary-500 dark:text-secondary-400">
                      <span>{conversation.nodeCount || 0} nodes</span>
                      <span>{formatDate(conversation.lastModified)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conversation._id);
                        }}
                        className="p-1 text-secondary-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conversation._id);
                        }}
                        className="p-1 text-secondary-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-2 line-clamp-2">
                      {conversation.title}
                    </h3>
                    
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4 line-clamp-3">
                      {conversation.description || 'No description'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-400">
                      <span className="flex items-center">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {conversation.nodeCount || 0} nodes
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(conversation.lastModified)}
                      </span>
                    </div>
                  </>
                )}
                </motion.div>
                
                {/* Ad Slot - Between conversations (every 3rd item) */}
                {viewMode === 'grid' && (index + 1) % 3 === 0 && (
                  <div className="col-span-full flex justify-center my-4">
                    <AdSlot 
                      slot={`dashboard-${Math.floor(index / 3)}`} 
                      size="banner" 
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
