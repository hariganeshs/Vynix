import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronUp, Copy, GitBranch, Move, Trash2, X, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Expanded Node View Component (outside React Flow)
const ExpandedNodeView = ({ node, onClose, onBranch, onDelete, onTitleEdit }) => {
  const [showBranchButton, setShowBranchButton] = useState(false);
  const [branchText, setBranchText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title || node.prompt.substring(0, 50));
  const textRef = useRef(null);
  const titleRef = useRef(null);
  const branchTextRef = useRef(null);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 0) {
      setBranchText(selectedText);
      setShowBranchButton(true);
      
      setTimeout(() => {
        if (branchTextRef.current) {
          branchTextRef.current.focus();
          branchTextRef.current.select();
        }
      }, 100);
    } else {
      setShowBranchButton(false);
      setBranchText('');
    }
  }, []);

  const handleBranchClick = useCallback((e) => {
    e.stopPropagation();
    if (onBranch && branchText) {
      const branchPrompt = `Please elaborate on this specific aspect: "${branchText}"`;
      onBranch(node.id, branchText, branchPrompt);
      setShowBranchButton(false);
      setBranchText('');
      window.getSelection().removeAllRanges();
      // Close the expanded view immediately for smooth transition
      onClose();
    }
  }, [onBranch, node.id, branchText, onClose]);

  const handleTitleEdit = useCallback((e) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(node.title || node.prompt.substring(0, 50));
    setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.focus();
        titleRef.current.select();
      }
    }, 100);
  }, [node.title, node.prompt]);

  const handleTitleSave = useCallback((e) => {
    e.stopPropagation();
    setIsEditingTitle(false);
    if (onTitleEdit) {
      onTitleEdit(node.id, editedTitle);
    }
  }, [onTitleEdit, node.id, editedTitle]);

  const handleTitleCancel = useCallback((e) => {
    e.stopPropagation();
    setIsEditingTitle(false);
    setEditedTitle(node.title || node.prompt.substring(0, 50));
  }, [node.title, node.prompt]);

  const handleCopyResponse = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(node.response);
    toast.success('Response copied to clipboard');
  }, [node.response]);

  const handleDeleteNode = useCallback((e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(node.id);
      onClose();
    }
  }, [onDelete, node.id, onClose]);

  const handleTextMouseUp = useCallback((e) => {
    e.stopPropagation();
    setTimeout(handleTextSelection, 50);
  }, [handleTextSelection]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 10, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 10, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-secondary-900 rounded-xl shadow-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <MessageSquare className="w-6 h-6 text-primary-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center space-x-2">
                  <input
                    ref={titleRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="flex-1 text-lg font-semibold text-secondary-900 dark:text-secondary-100 bg-transparent border-b border-primary-500 focus:outline-none focus:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleSave(e);
                      } else if (e.key === 'Escape') {
                        handleTitleCancel(e);
                      }
                    }}
                  />
                  <button
                    onClick={handleTitleSave}
                    className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleTitleCancel}
                    className="px-3 py-1 text-sm bg-secondary-200 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300 rounded hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 truncate">
                    {node.title || node.prompt.substring(0, 50)}
                  </h2>
                  <button
                    onClick={handleTitleEdit}
                    className="p-1 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
                    title="Edit title"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyResponse}
              className="p-2 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-800"
              title="Copy response"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={handleDeleteNode}
              className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors rounded-md hover:bg-red-100 dark:hover:bg-red-900/20"
              title="Delete node"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-800"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full max-h-[calc(90vh-120px)] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Prompt */}
            <div>
              <div className="text-sm font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wide mb-3">
                Prompt
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4 break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.prompt}</ReactMarkdown>
              </div>
            </div>

            {/* Response */}
            <div className="relative">
              <div className="text-sm font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wide mb-3">
                Response
              </div>
              <div
                ref={textRef}
                onMouseUp={handleTextMouseUp}
                onSelect={handleTextSelection}
                className="prose prose-sm dark:prose-invert max-w-none text-secondary-900 dark:text-secondary-100 bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4 cursor-text select-text break-words"
                style={{
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.response}</ReactMarkdown>
              </div>



              <AnimatePresence>
                {showBranchButton && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border-2 border-primary-200 dark:border-primary-700"
                  >
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-primary-700 dark:text-primary-300 flex items-center">
                        <GitBranch className="w-4 h-4 mr-2" />
                        Elaborate on Selection
                      </div>
                      
                      <textarea
                        ref={branchTextRef}
                        value={branchText}
                        onChange={(e) => setBranchText(e.target.value)}
                        placeholder="Edit the selected text before branching..."
                        className="w-full text-sm text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-800 rounded-lg p-3 border border-primary-300 dark:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleBranchClick(e);
                          }
                        }}
                      />
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBranchButton(false);
                            setBranchText('');
                            window.getSelection().removeAllRanges();
                          }}
                          className="px-4 py-2 text-sm bg-secondary-200 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleBranchClick}
                          disabled={!branchText.trim()}
                          className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 text-sm font-semibold transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          Create Branch
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center justify-between text-sm text-secondary-500 dark:text-secondary-400">
                <span>{node.metadata?.apiProvider || 'Unknown'}</span>
                <span>{node.metadata?.responseTime || 0}ms</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Custom Node Component
const ConversationNodeBase = ({ data, selected, readOnly = false }) => {
  const layout = data.layout || 'horizontal';
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBranchButton, setShowBranchButton] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(data.title || data.prompt.substring(0, 50));
  const [branchText, setBranchText] = useState('');
  const textRef = useRef(null);
  const titleRef = useRef(null);
  const branchTextRef = useRef(null);

  // Auto collapse when deselected
  useEffect(() => {
    if (!selected && isExpanded) {
      setIsExpanded(false);
    }
  }, [selected, isExpanded]);

  const handleTextSelection = useCallback(() => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText && selectedText.length > 0) {
      setBranchText(selectedText);
      setShowBranchButton(true);
      setTimeout(() => {
        if (branchTextRef.current) {
          branchTextRef.current.focus();
          branchTextRef.current.select();
        }
      }, 100);
    } else {
      setShowBranchButton(false);
      setBranchText('');
    }
  }, [readOnly]);

  const handleBranchClick = useCallback((e) => {
    e.stopPropagation();
    if (data.onBranch && branchText) {
      const branchPrompt = `Please elaborate on this specific aspect: "${branchText}"`;
      data.onBranch(data.id, branchText, branchPrompt);
      setShowBranchButton(false);
      setBranchText('');
      window.getSelection().removeAllRanges();
    }
  }, [data, branchText]);

  const handleTitleEdit = useCallback((e) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(data.title || data.prompt.substring(0, 50));
    setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.focus();
        titleRef.current.select();
      }
    }, 100);
  }, [data.title, data.prompt]);

  const handleTitleSave = useCallback((e) => {
    e.stopPropagation();
    setIsEditingTitle(false);
    if (data.onTitleEdit) {
      data.onTitleEdit(data.id, editedTitle);
    }
  }, [data, editedTitle]);

  const handleTitleCancel = useCallback((e) => {
    e.stopPropagation();
    setIsEditingTitle(false);
    setEditedTitle(data.title || data.prompt.substring(0, 50));
  }, [data.title, data.prompt]);

  const handleCopyResponse = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.response);
    toast.success('Response copied to clipboard');
  }, [data.response]);

  const handleDeleteNode = useCallback((e) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(data.id);
    }
  }, [data]);

  const handleExpandToggle = useCallback((e) => {
    e.stopPropagation();
    if (data.onExpand) {
      data.onExpand(data.id, data);
    }
  }, [data]);

  const handleNodeClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const selection = window.getSelection();
    const hasTextSelection = selection && selection.toString().trim().length > 0;
    if (!hasTextSelection) {
      if (data.onSelect) {
        data.onSelect(data.id, e);
      }
    }
  }, [data]);

  const handleTextMouseUp = useCallback((e) => {
    e.stopPropagation();
    handleTextSelection();
  }, [handleTextSelection]);

  return (
    <div
      className={cn(
        "relative min-w-[320px] max-w-[450px] bg-white dark:bg-secondary-900 rounded-lg border-2 transition-all duration-150 ease-out",
        selected ? "border-primary-500 shadow-xl ring-2 ring-primary-200" : "border-secondary-200 dark:border-secondary-700 hover:border-primary-300",
        isExpanded ? "z-50 shadow-2xl" : "z-10 shadow-lg"
      )}
      onClick={handleNodeClick}
      style={{ 
        pointerEvents: 'all',
        zIndex: isExpanded ? 50 : 10,
        cursor: 'pointer'
      }}
    >
      <Handle
        id="target"
        type="target"
        position={layout === 'vertical' ? Position.Top : Position.Left}
        style={{ width: 6, height: 6, opacity: 0, pointerEvents: 'none' }}
        isConnectable={false}
      />
      <Handle
        id="source"
        type="source"
        position={layout === 'vertical' ? Position.Bottom : Position.Right}
        style={{ width: 6, height: 6, opacity: 0, pointerEvents: 'none' }}
        isConnectable={false}
      />

      {selected && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary-500 rounded-full animate-pulse z-10"></div>
      )}
      
      {data.parentId && (
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-accent-500 rounded-full z-10"></div>
      )}
      
      <div className={cn(
        "flex items-center justify-between p-4 border-b transition-all duration-150",
        isExpanded 
          ? "border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20" 
          : "border-secondary-200 dark:border-secondary-700"
      )}>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <MessageSquare className={cn("w-5 h-5 flex-shrink-0", selected ? "text-primary-600" : "text-secondary-600")} />
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center space-x-2">
                <input
                  ref={titleRef}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 text-sm font-medium text-secondary-900 dark:text-secondary-100 bg-transparent border-b border-primary-500 focus:outline-none focus:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTitleSave(e);
                    } else if (e.key === 'Escape') {
                      handleTitleCancel(e);
                    }
                  }}
                />
                <button
                  onClick={handleTitleSave}
                  className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleTitleCancel}
                  className="px-2 py-1 text-xs bg-secondary-200 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300 rounded hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className={cn("text-sm font-medium truncate", selected ? "text-primary-700 dark:text-primary-300" : "text-secondary-700 dark:text-secondary-300")}> 
                  {data.title || data.prompt.substring(0, 40)}...
                </span>
                <button
                  onClick={handleTitleEdit}
                  className="p-1 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors opacity-0 group-hover:opacity-100"
                  title="Edit title"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
       <div className="flex items-center space-x-2">
         <button
           onClick={handleCopyResponse}
           className="p-2 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-800"
           title="Copy response"
         >
           <Copy className="w-4 h-4" />
         </button>
         <button
           onClick={handleExpandToggle}
           className="p-2 text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-800"
           title="Expand to full view"
         >
           <ChevronUp className="w-4 h-4" />
         </button>
         <button
           onClick={handleDeleteNode}
           className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors rounded-md hover:bg-red-100 dark:hover:bg-red-900/20"
           title="Delete node and all descendants"
         >
           <Trash2 className="w-4 h-4" />
         </button>
         <div 
           className="drag-handle p-2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors cursor-move active:cursor-grabbing bg-secondary-100 dark:bg-secondary-800 rounded-md"
           title="Drag to move node"
           style={{ pointerEvents: 'all', cursor: 'move' }}
         >
           <Move className="w-4 h-4" />
         </div>
       </div>
      </div>

      <div className="p-4">
        {data.metadata?.loading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 dark:bg-secondary-900/60 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 animate-pulse text-primary-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.5 3.5C7 3.5 5 5.5 5 8c0 1.2.5 2.2 1.3 3C6.1 13 6 15 6 16c0 3 2 4.5 6 4.5s6-1.5 6-4.5c0-1-.1-3-.3-5 .8-.8 1.3-1.8 1.3-3 0-2.5-2-4.5-4.5-4.5-1.3 0-2.4.5-3.2 1.4C11.9 4 10.8 3.5 9.5 3.5z" fill="currentColor"/>
              </svg>
              <span className="text-xs text-secondary-600 dark:text-secondary-300">Thinking...</span>
            </div>
          </div>
        )}
        {/* Response */}
        <div className="relative">
          <div className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Response
          </div>
          <motion.div
            ref={textRef}
            onMouseUp={handleTextMouseUp}
            onSelect={handleTextSelection}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none text-secondary-900 dark:text-secondary-100 bg-secondary-50 dark:bg-secondary-800 rounded-md p-3 cursor-text transition-all border border-transparent hover:border-secondary-300 dark:hover:border-secondary-600 select-text break-words overflow-x-auto",
              isExpanded ? "max-h-none" : "max-h-32 overflow-hidden"
            )}
            initial={false}
            animate={{
              maxHeight: isExpanded ? "none" : "8rem",
              overflow: isExpanded ? "visible" : "hidden"
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text',
              pointerEvents: 'all',
              position: 'relative',
              cursor: 'text',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere'
            }}
            contentEditable={false}
            draggable={false}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.response}</ReactMarkdown>
          </motion.div>



          <AnimatePresence>
            {showBranchButton && !readOnly && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl border-2 border-primary-200 dark:border-primary-700"
              >
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-primary-700 dark:text-primary-300 flex items-center">
                    <GitBranch className="w-4 h-4 mr-2" />
                    Elaborate on Selection
                  </div>
                  
                  <textarea
                    ref={branchTextRef}
                    value={branchText}
                    onChange={(e) => setBranchText(e.target.value)}
                    placeholder="Edit the selected text before branching..."
                    className="w-full text-sm text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-800 rounded-lg p-3 border border-primary-300 dark:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleBranchClick(e);
                      }
                    }}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBranchButton(false);
                        setBranchText('');
                        window.getSelection().removeAllRanges();
                      }}
                      className="px-4 py-2 text-sm bg-secondary-200 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBranchClick}
                      disabled={!branchText.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 text-sm font-semibold transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      Create Branch
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-400">
            <span>{data.metadata?.apiProvider || 'Unknown'}</span>
            <span>{data.metadata?.responseTime || 0}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConversationNode = React.memo(ConversationNodeBase);

const ConversationTree = ({ 
  conversation, 
  onBranch, 
  onNodeSelect, 
  onDeleteNode,
  onTitleEdit,
  selectedNodes = [],
  layout = 'horizontal',
  focusNodeId = null,
  isSending = false,
  pendingParentId = null,
  readOnly = false
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedNode, setExpandedNode] = useState(null);
  const { fitView, setCenter, getNode, getViewport } = useReactFlow();
  const hasFittedRef = useRef(false);
  const prevConvKeyRef = useRef(null);
  const prevNodeIdsRef = useRef(new Set());

  // Center helper using measured node size and current zoom
  const centerOnNodeId = useCallback((nodeId, duration = 200) => {
    const vn = getNode?.(nodeId);
    if (!vn) return;
    const width = (vn.width ?? 450);
    const height = (vn.height ?? 700);
    const ax = (vn.positionAbsolute?.x ?? vn.position.x) + width / 2;
    // Bias Y slightly downward so the title/header is clearly visible
    const ayCenter = (vn.positionAbsolute?.y ?? vn.position.y) + height / 2;
    const ay = ayCenter + height * 0.06;
    const zoom = getViewport?.().zoom ?? undefined;
    // Direct call for stable transitions
    setCenter(ax, ay, { duration, zoom });
  }, [getNode, getViewport, setCenter]);

  const handleNodeSelection = useCallback((nodeId, event) => {
    if (onNodeSelect) {
      if (!event?.ctrlKey) {
        onNodeSelect(nodeId);
      } else {
        onNodeSelect(nodeId, true);
      }
    }
  }, [onNodeSelect]);

  const handleNodeExpand = useCallback((nodeId, nodeData) => {
    setExpandedNode(nodeData);
  }, []);

  const handleExpandedNodeClose = useCallback(() => {
    setExpandedNode(null);
  }, []);

  const handleExpandedNodeBranch = useCallback((nodeId, selectedText, branchPrompt) => {
    if (onBranch) {
      onBranch(nodeId, selectedText, branchPrompt);
    }
  }, [onBranch]);

  const handleExpandedNodeDelete = useCallback((nodeId) => {
    if (onDeleteNode) {
      onDeleteNode(nodeId);
    }
  }, [onDeleteNode]);

  const handleExpandedNodeTitleEdit = useCallback((nodeId, newTitle) => {
    if (onTitleEdit) {
      onTitleEdit(nodeId, newTitle);
    }
  }, [onTitleEdit]);

  // Convert conversation tree to React Flow format with hierarchical pre-order layout
  const convertToReactFlow = useCallback((treeData) => {
    const rfNodes = [];
    const rfEdges = [];

    const NODE_WIDTH = 450;
    const NODE_HEIGHT = 700; // Use actual node height for stable layout
    const HORIZONTAL_SPACING = 200; // Space between columns (wider to reduce crowding)
    const VERTICAL_SPACING = 200;   // Space between nodes in same column (larger to prevent crowding)
    const START_X = 50;
    const START_Y = 50;

    // Hierarchical Tree Layout Algorithm (supports both horizontal and vertical)
    const calculateHierarchicalLayout = (nodes) => {
      const nodeMap = new Map();
      const childrenMap = new Map(); // parentId -> array of child nodes
      const levelMap = new Map();    // level -> array of nodes at that level
      
      // First pass: build node map and collect all nodes
      nodes.forEach(node => {
        nodeMap.set(node.id, { ...node, level: 0, x: 0, y: 0 });
        
        if (node.parentId) {
          if (!childrenMap.has(node.parentId)) {
            childrenMap.set(node.parentId, []);
          }
          childrenMap.get(node.parentId).push(node.id);
        }
      });
      
      // Second pass: calculate levels (depth from root)
      const calculateLevels = (nodeId, level) => {
        const node = nodeMap.get(nodeId);
        if (node) {
          node.level = Math.max(node.level, level);
          levelMap.set(level, levelMap.get(level) || []);
          levelMap.get(level).push(nodeId);
          
          // Process children
          const children = childrenMap.get(nodeId) || [];
          children.forEach(childId => calculateLevels(childId, level + 1));
        }
      };
      
      // Find root nodes (nodes without parents)
      const rootNodes = Array.from(nodeMap.values()).filter(node => !node.parentId);
      rootNodes.forEach(node => calculateLevels(node.id, 0));
      
      // Third pass: calculate positions using hierarchical layout
      const calculatePositions = (nodeId, primaryPos, secondaryPos) => {
        const node = nodeMap.get(nodeId);
        if (!node) return { size: 0 };
        
        const children = childrenMap.get(nodeId) || [];
        
        if (layout === 'horizontal') {
          // Horizontal layout: children to the right of parent
          node.x = primaryPos;
          node.y = secondaryPos;
          
          if (children.length === 0) {
            return { size: NODE_HEIGHT + VERTICAL_SPACING };
          }
          
          // Position children to the right of parent
          const childPrimaryPos = primaryPos + NODE_WIDTH + HORIZONTAL_SPACING;
          let totalChildSize = 0;
          let currentSecondaryPos = secondaryPos;
          
          children.forEach(childId => {
            const childResult = calculatePositions(childId, childPrimaryPos, currentSecondaryPos);
            currentSecondaryPos += childResult.size;
            totalChildSize += childResult.size;
          });
          
          // Adjust this node's position to center it among its children
          if (children.length > 0) {
            const firstChild = nodeMap.get(children[0]);
            const lastChild = nodeMap.get(children[children.length - 1]);
            if (firstChild && lastChild) {
              const childrenCenterY = (firstChild.y + lastChild.y + NODE_HEIGHT) / 2;
              node.y = childrenCenterY - NODE_HEIGHT / 2;
            }
          }
          
          return { size: Math.max(NODE_HEIGHT + VERTICAL_SPACING, totalChildSize) };
        } else {
          // Vertical layout: children below parent
          node.x = secondaryPos;
          node.y = primaryPos;
          
          if (children.length === 0) {
            return { size: NODE_WIDTH + HORIZONTAL_SPACING };
          }
          
          // Position children below parent
          const childPrimaryPos = primaryPos + NODE_HEIGHT + VERTICAL_SPACING;
          let totalChildSize = 0;
          let currentSecondaryPos = secondaryPos;
          
          children.forEach(childId => {
            const childResult = calculatePositions(childId, childPrimaryPos, currentSecondaryPos);
            currentSecondaryPos += childResult.size;
            totalChildSize += childResult.size;
          });
          
          // Adjust this node's position to center it among its children
          if (children.length > 0) {
            const firstChild = nodeMap.get(children[0]);
            const lastChild = nodeMap.get(children[children.length - 1]);
            if (firstChild && lastChild) {
              const childrenCenterX = (firstChild.x + lastChild.x + NODE_WIDTH) / 2;
              node.x = childrenCenterX - NODE_WIDTH / 2;
            }
          }
          
          return { size: Math.max(NODE_WIDTH + HORIZONTAL_SPACING, totalChildSize) };
        }
      };
      
      // Position all root nodes
      if (layout === 'horizontal') {
        let currentY = START_Y;
        rootNodes.forEach(rootNode => {
          const result = calculatePositions(rootNode.id, START_X, currentY);
          currentY += result.size;
        });
      } else {
        let currentX = START_X;
        rootNodes.forEach(rootNode => {
          const result = calculatePositions(rootNode.id, START_Y, currentX);
          currentX += result.size;
        });
      }
      
      return Array.from(nodeMap.values());
    };

    if (!Array.isArray(treeData) || treeData.length === 0) {
      return { nodes: rfNodes, edges: rfEdges };
    }

    const idToNode = new Map();
    const collect = (node, parentId = null) => {
      const merged = { ...node };
      if (parentId) merged.parentId = parentId;
      idToNode.set(merged.id, merged);
      if (Array.isArray(merged.children)) {
        merged.children.forEach((child) => collect(child, merged.id));
      }
    };
    treeData.forEach((root) => collect(root, null));

    // Apply hierarchical layout
    const layoutedNodes = calculateHierarchicalLayout(Array.from(idToNode.values()));

    // Post-process: per-column compaction to prevent overlaps without changing hierarchy
    // Group nodes by approximate x (columns)
    const columns = [];
    const COLUMN_EPS = 20; // tolerance to group nodes in same column
    layoutedNodes.forEach(n => {
      let col = columns.find(c => Math.abs(c.x - n.x) < COLUMN_EPS);
      if (!col) {
        col = { x: n.x, nodes: [] };
        columns.push(col);
      }
      col.nodes.push(n);
    });
    // For each column, sort by y and enforce minimum gaps
    columns.forEach(col => {
      col.nodes.sort((a, b) => a.y - b.y);
      let cursorY = null;
      col.nodes.forEach(node => {
        const minGap = NODE_HEIGHT + VERTICAL_SPACING;
        if (cursorY === null) {
          cursorY = node.y;
        } else {
          if (node.y < cursorY + minGap) {
            node.y = cursorY + minGap;
          }
        }
        cursorY = node.y;
      });
    });

    layoutedNodes.forEach((node) => {
      const isSelected = selectedNodes.includes(node.id);
      rfNodes.push({
        id: node.id,
        type: 'conversationNode',
        position: { x: node.x, y: node.y },
        data: {
          ...node,
          onBranch,
          onSelect: handleNodeSelection,
          onDelete: onDeleteNode,
          onExpand: handleNodeExpand,
          onTitleEdit: handleExpandedNodeTitleEdit,
          layout,
          metadata: {
            ...(node.metadata || {}),
            loading: isSending && pendingParentId === node.id
          }
        },
        draggable: true,
        dragHandle: '.drag-handle',
        selectable: false,
        selected: isSelected,
        style: { pointerEvents: 'all' }
      });

      if (node.parentId) {
        rfEdges.push({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#64748b', strokeWidth: 2 }
        });
      }
    });



    return { nodes: rfNodes, edges: rfEdges };
  }, [onBranch, selectedNodes, handleNodeSelection, onDeleteNode, layout, handleNodeExpand, handleExpandedNodeTitleEdit, isSending, pendingParentId]);

  React.useEffect(() => {
    const tree = conversation?.treeStructure;
    const convKey = conversation?._id || conversation?.id || (Array.isArray(tree) ? tree.map(n => n.id).join('|') : '');
    if (prevConvKeyRef.current !== convKey) {
      hasFittedRef.current = false;
      prevConvKeyRef.current = convKey;
    }

    if (conversation?.treeStructure) {
      const { nodes: newNodes, edges: newEdges } = convertToReactFlow(conversation.treeStructure);
      const currentNodeIds = new Set(newNodes.map(node => node.id));
      
      setNodes(newNodes);
      setEdges(newEdges);
      
      // Auto-focus on newly created nodes - wait for stabilization
      if (prevNodeIdsRef.current.size > 0) {
        const newlyAddedNodeIds = Array.from(currentNodeIds).filter(id => !prevNodeIdsRef.current.has(id));
        if (newlyAddedNodeIds.length > 0) {
          const newestNodeId = newlyAddedNodeIds[0];
          // Wait for node to be fully rendered and stable before centering
          setTimeout(() => {
            centerOnNodeId(newestNodeId, 200);
            if (onNodeSelect) {
              onNodeSelect(newestNodeId);
            }
          }, 100);
        }
      }
      
      prevNodeIdsRef.current = currentNodeIds;
      
      // Fit view after stabilization for better responsiveness
      if (!hasFittedRef.current) {
        setTimeout(() => {
          fitView({ padding: 0.1, duration: 0 });
        }, 50);
        hasFittedRef.current = true;
      }
    } else {
      setNodes([]);
      setEdges([]);
      prevNodeIdsRef.current = new Set();
    }
  }, [conversation, convertToReactFlow, setNodes, setEdges, fitView, onNodeSelect, centerOnNodeId]);

  // Handle focus on specific node - wait for stabilization
  React.useEffect(() => {
    if (focusNodeId && nodes.length > 0) {
      if (nodes.find(n => n.id === focusNodeId)) {
        // Wait for node to be fully rendered and stable before centering
        setTimeout(() => {
          centerOnNodeId(focusNodeId, 200);
          if (onNodeSelect) {
            onNodeSelect(focusNodeId);
          }
        }, 100);
      }
    }
  }, [focusNodeId, nodes, onNodeSelect, centerOnNodeId]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const nodeTypes = useMemo(() => ({
    conversationNode: (props) => <ConversationNode {...props} readOnly={readOnly} />
  }), [readOnly]);

  return (
    <div className="w-full h-full" style={{ pointerEvents: 'all' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        selectNodesOnDrag={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        preventScrolling={false}
        style={{ pointerEvents: 'all' }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        fitViewOptions={{ padding: 0.1, duration: 250 }}
      >
        <Controls 
          className="bg-white/95 dark:bg-secondary-900/95 backdrop-blur-sm border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-xl" 
          position="top-left"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
        <Background 
          color="#475569" 
          gap={100} 
          size={2}
          className="opacity-20"
        />
        <MiniMap 
          className="!bg-white/90 dark:!bg-secondary-900/90 backdrop-blur-sm border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-xl"
          nodeColor="#0ea5e9"
          maskColor="rgba(15,23,42,0.3)"
        />
      </ReactFlow>

      {expandedNode && (
        <ExpandedNodeView
          node={expandedNode}
          onClose={handleExpandedNodeClose}
          onBranch={handleExpandedNodeBranch}
          onDelete={handleExpandedNodeDelete}
          onTitleEdit={handleExpandedNodeTitleEdit}
        />
      )}
    </div>
  );
};

export default ConversationTree;