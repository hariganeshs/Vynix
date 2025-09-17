import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';
import toast from 'react-hot-toast';
import ConversationTree from '../components/ConversationTree';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const SharedConversation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSharedConversation();
  }, [token]);

  const loadSharedConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/conversations/shared/${token}`);
      setConversation(response.data.conversation);
    } catch (error) {
      console.error('Failed to load shared conversation:', error);
      setError('Shared conversation not found or no longer available');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
            Conversation Not Found
          </h3>
          <p className="text-secondary-500 dark:text-secondary-400 mb-6">
            {error || 'This shared conversation may have been removed or is no longer available.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary-50 to-accent-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between p-4 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
              {conversation.title}
            </h1>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Shared conversation • {conversation.nodes?.length || 0} nodes
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLink}
            className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors"
            title="Copy link"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/conversation/new')}
            className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors"
            title="Create your own conversation"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Tree Visualization */}
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <ConversationTree
              conversation={conversation}
              onBranch={() => {}} // Disabled for shared conversations
              onNodeSelect={() => {}} // Disabled for shared conversations
              onDeleteNode={() => {}} // Disabled for shared conversations
              onTitleEdit={() => {}} // Disabled for shared conversations
              selectedNodes={[]}
              layout="vertical"
              focusNodeId={null}
              isSending={false}
              pendingParentId={null}
              readOnly={true} // Make it read-only
            />
          </ReactFlowProvider>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-t border-secondary-200 dark:border-secondary-700">
        <div className="text-center text-sm text-secondary-500 dark:text-secondary-400">
          This is a shared conversation. Create your own to start branching and exploring ideas.
        </div>
      </div>
    </div>
  );
};

export default SharedConversation;
