import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import axios from 'axios';
import FileTreeExplorer from './FileTreeExplorer';
import Terminal from './Terminal';
import AIAssistant from './AIAssistant';
import Editor from "@monaco-editor/react";
import { debounce } from 'lodash';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  Terminal as TerminalIcon, 
  Eye, 
  Play, 
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Brain,
  Save,
  ExternalLink,
  GripVertical
} from 'lucide-react';

function useSocket(ownerId, userId, replId, domain, username) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!domain) return; // Only connect when we have a domain

    const socketUrl = `http://${domain}`;
    console.log(`Connecting to socket at ${socketUrl}`);

    const newSocket = io(socketUrl, {
      path: '/runner/socket.io',
      query: {
        ownerId,
        userId,
        repl_id: replId,
        username
      },
    });

    console.log(`Socket connected: ${newSocket}`);

    setSocket(newSocket);

    // Cleanup function to disconnect socket when component unmounts
    return () => {
      if (newSocket) {
        console.log(`Disconnecting socket from ${socketUrl}`);
        newSocket.disconnect();
      }
    };
  }, [userId, replId, domain]); // Only recreate socket if userId, replId, or domain changes

  console.log("Socket state:", socket);
  return socket;
}

const ReplEditor = () => {
  const [podCreated, setPodCreated] = useState(false);
  const [podCreating, setPodCreating] = useState(false);
  const [podError, setPodError] = useState(null);
  const [domain, setDomain] = useState(null);
  const [ownerId, setOwnerId] = useState(null); // State to store the owner's ID
  const { id, lang } = useParams();
  const { user } = useAuth();
  const [repl, setRepl] = useState(null);

  useEffect(() => {
    if (!id || !user || !user._id) return;

    // Fetch REPL details to determine the owner
    const fetchReplDetails = async () => {
      try {
        const response = await api.get(`/api/repls/${id}`);
        if (response.data.success) {
          const repl = response.data.repl;
          setRepl(repl);
          setOwnerId(repl.creator); // Set the owner's ID
        } else {
          throw new Error('Failed to fetch REPL details');
        }
      } catch (error) {
        console.error('Error fetching REPL details:', error);
        setPodError('Failed to load REPL details');
      }
    };

    fetchReplDetails();
  }, [id, user?._id]);

  useEffect(() => {
    console.log("useEffect for pod creation");
    if (!id || !user || !user._id || !ownerId) {
      console.log(id, user, user._id, ownerId);
      console.log("Missing parameters for pod creation");
      return;
    }

    // Flag to avoid multiple requests
    let cancelled = false;

    const createPod = async () => {
      try {
        setPodCreating(true);
        console.log("Creating pod...12");
        const response = await axios.post(`${import.meta.env.VITE_POD_DEPLOYMENT_URL}/api/deploy`, {
          userId: ownerId, // Use the owner's ID here
          replId: id,
          language: lang,
        });
        console.log("Creating pod...34");
        console.log("Response from pod creation:", response.data);
        if (!cancelled && response.data.success) {
          console.log("Pod created successfully");
          setPodCreated(true);
          setDomain(response.data.domain);
        } else if (!cancelled) {
          throw new Error('Failed to create pod');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error creating pod:', err);
          setPodError('An error occurred while creating the pod');
        }
      } finally {
        if (!cancelled) setPodCreating(false);
      }
    };

    createPod();

    return () => {
      cancelled = true;
    };
  }, [id, user?._id, lang, ownerId]);

  if (podCreating) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4">
            <Loader2 className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold">Setting up your development environment...</h2>
          <p className="text-gray-400 mt-2">This might take a few moments.</p>
        </motion.div>
      </div>
    );
  }

  if (podError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-gray-800 rounded-2xl shadow-xl max-w-md"
        >
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400">Error Setting Up Environment</h2>
          <p className="text-gray-400 mt-2">{podError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Try Again</span>
          </button>
        </motion.div>
      </div>
    );
  }

  if (!podCreated || !domain) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500">
          <Loader2 className="h-12 w-12 text-blue-500" />
        </div>
      </div>
    );
  }

  return <ReplEditorContent domain={domain} ownerId={ownerId} repl={repl} />;
};

const ReplEditorContent = ({ domain, ownerId, repl }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileCache, setFileCache] = useState({});
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());
  const [showTerminal, setShowTerminal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [collaboratorCursors, setCollaboratorCursors] = useState({});
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const { user } = useAuth();
  const socket = useSocket(ownerId, user._id, id, domain, user.username);
  const editorRef = useRef(null);
  const [isDevServerRunning, setIsDevServerRunning] = useState(false);
  const [debouncedSaveFunctions] = useState(new Map());
  const [aiAssistantWidth, setAiAssistantWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    if (!socket) return;

    // Listen for file changes
    socket.on('file:edit', ({ filePath, content, userId }) => {
      console.log(`File updated by user ${userId}: ${filePath}`);
      if (currentFile?.path === filePath) {
        setFileContent(content);
      }
      setFileCache((prev) => ({ ...prev, [filePath]: content }));
    });

    // Listen for cursor movements
    socket.on('cursor:move', ({ filePath, position, username }) => {
      console.log(`Cursor moved by user ${username}: ${filePath}`, position);
      if (currentFile?.path === filePath) {
        setCollaboratorCursors((prev) => ({
          ...prev,
          [username]: position,
        }));
      }
    });

    return () => {
      socket.off('file:edit');
      socket.off('cursor:move');
    };
  }, [socket, currentFile]);

  useEffect(() => {
    console.log("useEffect for collaborator cursors");
    if (!editorRef.current) return;
    console.log("Editor ref is available");
    const editor = editorRef.current;
    const decorations = Object.entries(collaboratorCursors).map(([username, position]) => {
      const userClassName = `user-label-${username}`;
      if (!document.getElementById(userClassName)) {
        const style = document.createElement('style');
        style.id = userClassName;
        style.innerHTML = `
          .${userClassName}::after {
            content: '${username}';
            position: absolute;
            background: #4f46e5;
            color: white;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 10px;
            top: -20px;
            left: 0;
            white-space: nowrap;
          }
        `;
        document.head.appendChild(style);
      }

      return {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: 'border-l-2 border-collaboratorCursor bg-collaboratorBackground',
          glyphMarginClassName: 'bg-collaboratorCursor',
          afterContentClassName: `relative ${userClassName}`,
        },
      };
    });

    console.log("Decorations:");
    const decorationIds = editor.deltaDecorations([], decorations);
    console.log("Decoration IDs:", decorationIds);
    return () => {
      editor.deltaDecorations(decorationIds, []); // Cleanup decorations
    };
  }, [collaboratorCursors]);

  const handleEditorDidMount = (editor) => {
    console.log('Editor mounted');
    editorRef.current = editor;
    setIsEditorMounted(true);
    editor.onDidChangeCursorPosition((event) => {
      const position = event.position;
      handleCursorMove(position);
    });
  };

  const getDebouncedSaveFunction = (filePath) => {
    if (!debouncedSaveFunctions.has(filePath)) {
      const debouncedFn = debounce(async (content) => {
        try {
          console.log(`Saving file: ${filePath}`);
          socket.emit("saveFile", { filePath, content }, (response) => {
            if (response.success) {
              console.log(`File saved: ${filePath}`);
              setUnsavedFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(filePath);
                return newSet;
              });
            } else {
              console.error('Error saving file:', response.error);
            }
          });
        } catch (error) {
          console.error('Error saving file:', error);
        }
      }, 2000);
      debouncedSaveFunctions.set(filePath, debouncedFn);
    }
    return debouncedSaveFunctions.get(filePath);
  };

  const handleCursorMove = (position) => {
    if (!currentFile) return;
    // Emit cursor position to other users
    socket.emit('cursor:move', { filePath: currentFile.path, position });
  };

  const checkPreviewAvailability = async () => {
    try {
      const response = await fetch(`http://${domain}/`, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      setPreviewAvailable(true);
    } catch (error) {
      setPreviewAvailable(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (file.type === 'file') {
      try {
        // Check if file is in cache
        if (fileCache[file.path]) {
          setCurrentFile(file);
          setFileContent(fileCache[file.path]);
        } else {
          console.log("fetching content 101")
          socket.emit("fetchContent", file.path, (response) => {
            setCurrentFile(file);
            setFileContent(response);
            // Update cache
            setFileCache(prev => ({
              ...prev,
              [file.path]: response
            }));
          })
        }
      } catch (error) {
        console.error('Error loading file:', error);
      }
    }
  };

  const handleEditorChange = (value) => {
    if (!currentFile) return;

    // Update file content in state
    setFileContent(value);

    // Update cache
    setFileCache(prev => ({
      ...prev,
      [currentFile.path]: value
    }));

    // Emit file edit event
    socket.emit('file:edit', { filePath: currentFile.path, content: value });
    
    // Mark file as unsaved
    setUnsavedFiles(prev => new Set(prev).add(currentFile.path));

    // Trigger debounced save
    const debouncedSave = getDebouncedSaveFunction(currentFile.path);
    debouncedSave(value);
  };

  const toggleTerminal = () => {
    setShowTerminal(prev => {
      const newShowTerminal = !prev;
      if (showPreview && !newShowTerminal) {
        setShowPreview(false);
      }
      return newShowTerminal;
    });
  };

  const togglePreview = () => {
    checkPreviewAvailability();
    setShowPreview(prev => {
      const newShowPreview = !prev;
      if (showTerminal && !newShowPreview) {
        setShowTerminal(false);
      }
      return newShowPreview;
    });
  };

  const handleRun = () => {
    if (repl.language === 'reactjs') {
      if (!isDevServerRunning) {
        socket.emit('terminal:input', 'npm install\r');
        
        setTimeout(() => {
          socket.emit('terminal:input', 'npm run dev\r');
          setIsDevServerRunning(true);
          
          setTimeout(() => {
            setShowPreview(true);
            setShowTerminal(false);
          }, 3000);
        }, 10000); 
      } else {
        setShowPreview(true);
        setShowTerminal(false);
      }
    } else if (currentFile && currentFile.name.endsWith('.cpp')) {
      // Existing C++ handling
      const filePath = currentFile.path.replace(/^workspace\//, '');
      const compileCommand = `g++ "${filePath}"\r`;
      socket.emit('terminal:input', compileCommand);
    } else if (currentFile && currentFile.name.endsWith('.py')) {
      // Python file handling
      const filePath = currentFile.path.replace(/^workspace\//, '');
      // Use absolute path to ensure it works regardless of current terminal directory
      const runCommand = `python "/workspace/${filePath}"\r`;
      socket.emit('terminal:input', runCommand);
    }
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = aiAssistantWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const deltaX = dragStartX.current - e.clientX;
    const newWidth = Math.min(Math.max(dragStartWidth.current + deltaX, 200), 800);
    setAiAssistantWidth(newWidth);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 relative z-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Go back"
              >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
            <Code className="h-6 w-6 text-blue-500" />
            <h1 className="text-xl font-semibold">{repl?.name || 'Untitled Project'}</h1>
                {unsavedFiles.size > 0 && (
              <span className="text-sm text-yellow-400 flex items-center gap-1">
                <Save size={14} />
                {unsavedFiles.size} unsaved {unsavedFiles.size === 1 ? 'file' : 'files'}
                </span>
              )}
            </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAI(!showAI)}
              className={`p-2 rounded-lg transition-colors ${
                showAI ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Brain className="h-5 w-5" />
            </button>
              <button
                onClick={toggleTerminal}
              className={`p-2 rounded-lg transition-colors ${
                showTerminal ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              >
              <TerminalIcon className="h-5 w-5" />
              </button>
            
              <button
                onClick={togglePreview}
                className={`p-2 rounded-lg transition-colors ${
                  showPreview ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Eye className="h-5 w-5" />
              </button>
          
              <button
                onClick={handleRun}
              className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
              <Play className="h-5 w-5" />
              </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 250, opacity: 1 }}
          className="bg-gray-800 border-r border-gray-700"
        >
        <FileTreeExplorer onFileSelect={handleFileSelect} socket={socket} />
        </motion.div>

        {/* Editor and AI Assistant */}
        <div className="flex-1 flex relative">
        <div className="flex-1 flex flex-col">
            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
            {currentFile ? (
                  <motion.div
                    key={currentFile.path}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
              <Editor
                height="100%"
                defaultLanguage={repl.language}
                value={fileContent}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  backgroundColor: '#1F2937',
                  colors: {
                    'editor.background': '#1F2937',
                    'editor.foreground': '#E5E7EB',
                    'editor.lineHighlightBackground': '#374151',
                    'editor.selectionBackground': '#4B5563',
                    'editor.inactiveSelectionBackground': '#374151',
                    'editorCursor.foreground': '#E5E7EB',
                    'editorWhitespace.foreground': '#4B5563',
                    'editorIndentGuide.background': '#374151',
                    'editorIndentGuide.activeBackground': '#4B5563',
                    'editorLineNumber.foreground': '#6B7280',
                    'editorLineNumber.activeForeground': '#E5E7EB',
                  },
                  suggest: {
                    showWords: true,
                    showColors: true,
                    showFiles: true,
                    showFolders: true,
                    showTypeParameters: true,
                    showEnums: true,
                    showEnumsMembers: true,
                    showConstructors: true,
                    showDeprecated: true,
                    showFields: true,
                    showFunctions: true,
                    showInterfaces: true,
                    showIssues: true,
                    showKeywords: true,
                    showMethods: true,
                    showModules: true,
                    showOperators: true,
                    showProperties: true,
                    showReferences: true,
                    showSnippets: true,
                    showStructs: true,
                    showUnits: true,
                    showValues: true,
                    showVariables: true
                  }
                }}
              />
                  </motion.div>
            ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center text-gray-400"
                  >
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                      <p>Select a file to start editing</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Terminal */}
            <AnimatePresence>
              {showTerminal && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 300 }}
                  exit={{ height: 0 }}
                  className="border-t border-gray-700"
                >
                  <Terminal socket={socket} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preview */}
            <AnimatePresence>
              {showPreview && previewAvailable && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 300 }}
                  exit={{ height: 0 }}
                  className="border-t bg-white relative"
                >
                  <div className="absolute top-2 right-2 z-10">
                    <a
                      href={`http://${domain}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-700  text-black hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in new tab
                    </a>
              </div>
                  <iframe
                    src={`http://${domain}/preview`}
                    className="w-full h-full"
                    title="Preview"
                  />
                </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* AI Assistant */}
          <AnimatePresence>
            {showAI && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: aiAssistantWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 bg-gray-800 border-l border-gray-700 shadow-xl"
                style={{ zIndex: 5 }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={handleDragStart}
                >
                  <GripVertical className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
          {isEditorMounted && (
            <AIAssistant
              currentFile={currentFile}
              fileContent={fileContent}
              onApplyChanges={handleEditorChange}
              editorRef={editorRef}
            />
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ReplEditor;

