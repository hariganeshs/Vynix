import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  Download, 
  Play, 
  Settings,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const LMStudioGuide = ({ onConnectionTest }) => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [isTesting, setIsTesting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const checkConnection = async () => {
    try {
      setIsTesting(true);
      setConnectionStatus('checking');
      
      const response = await api.post('/ai/test-connection', {
        provider: 'lmstudio'
      });
      
      if (response.data.success) {
        setConnectionStatus('connected');
        toast.success('LM Studio connection successful!');
      } else {
        setConnectionStatus('disconnected');
        setShowGuide(true);
      }
    } catch (error) {
      console.error('LM Studio connection test failed:', error);
      setConnectionStatus('disconnected');
      setShowGuide(true);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'LM Studio is running and ready';
      case 'disconnected':
        return 'LM Studio is not running';
      default:
        return 'Checking LM Studio connection...';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm rounded-lg border border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center space-x-3">
          <Server className="w-6 h-6 text-primary-600" />
          <div>
            <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
              LM Studio Connection
            </h3>
            <div className="flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={checkConnection}
          disabled={isTesting}
          className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Setup Guide */}
      <AnimatePresence>
        {showGuide && connectionStatus === 'disconnected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                LM Studio Setup Guide
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Step 1: Download */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Download LM Studio
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Download and install LM Studio from the official website
                  </p>
                  <a
                    href="https://lmstudio.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download LM Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Step 2: Load Model */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Load a Model
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Download and load a compatible model (e.g., GPT-3.5, Llama)
                  </p>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Recommended: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">openai/gpt-oss-20b</code>
                  </div>
                </div>

                {/* Step 3: Start Server */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Start Local Server
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Click "Start Server" in LM Studio to enable the API
                  </p>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Server runs on: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://127.0.0.1:1234</code>
                  </div>
                </div>

                {/* Step 4: Test Connection */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Test Connection
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Click the refresh button above to test your connection
                  </p>
                  <button
                    onClick={checkConnection}
                    disabled={isTesting}
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Test Now</span>
                  </button>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Troubleshooting
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Make sure LM Studio is running and the server is started</li>
                  <li>• Check that a model is loaded and ready</li>
                  <li>• Verify the server is running on port 1234</li>
                  <li>• Try restarting LM Studio if connection fails</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LMStudioGuide;
