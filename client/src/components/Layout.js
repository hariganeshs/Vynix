import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Plus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewConversation = () => {
    navigate('/conversation/new');
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-secondary-900 dark:to-secondary-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Vynix</span>
            </motion.div>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <button
                onClick={handleNewConversation}
                className="btn btn-primary px-4 py-2 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-ghost px-3 py-2 text-sm"
              >
                Dashboard
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800"
                title={`Current theme: ${theme}`}
              >
                {getThemeIcon()}
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    {user?.name}
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-secondary-400">
                    {user?.email}
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2 text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100 transition-colors rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
