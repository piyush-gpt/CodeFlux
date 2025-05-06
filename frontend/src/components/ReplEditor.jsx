import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import axios from 'axios';
import FileTreeExplorer from './FileTreeExplorer';
import Terminal from './Terminal';
import Editor from "@monaco-editor/react";
import { debounce } from 'lodash';
import io from 'socket.io-client';

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
        const response = await axios.post(`http://localhost:4001/api/deploy`, {
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Setting up your development environment...</h2>
          <p className="text-gray-600 mt-2">This might take a few moments.</p>
        </div>
      </div>
    );
  }

  if (podError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-red-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-red-600">Error Setting Up Environment</h2>
          <p className="text-gray-700 mt-2">{podError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!podCreated || !domain) {
    console.log("Pod not created or domain not available");
    console.log("Pod created:", podCreated);
    console.log("Domain:", domain);
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
  const [collaboratorCursors, setCollaboratorCursors] = useState({});
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const { user } = useAuth();
  const socket = useSocket(ownerId, user._id, id, domain, user.username);
  const editorRef = useRef(null);


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
    editorRef.current = editor; // Store the editor instance
    editor.onDidChangeCursorPosition((event) => {
      const position = event.position; // Get the new cursor position
      handleCursorMove(position); // Call your cursor move handler
    });
  };


  const debouncedSaveToS3 = useMemo(() => {
    if (!socket) return () => { }; // no-op if no socket
    console.log("Creating debounced save function");
    return debounce(async (filePath, content) => {
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
  }, [socket]);

  const handleCursorMove = (position) => {
    console.log("Cursor moved:", position);
    if (!currentFile) return;
    console.log("Current file is available");
    // Emit cursor position to other users
    socket.emit('cursor:move', { filePath: currentFile.path, position });
    console.log("Emitting cursor move event");
  };

  const checkPreviewAvailability = async () => {
    try {
      // Use the dynamic domain for preview
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

    console.log("File content updated:");
    // Update cache
    setFileCache(prev => ({
      ...prev,
      [currentFile.path]: value
    }));

    console.log("Emitting file edit event");
    socket.emit('file:edit', { filePath: currentFile.path, content: value });
    // Mark file as unsaved
    setUnsavedFiles(prev => new Set(prev).add(currentFile.path));

    console.log("Unsaved files:");
    // Trigger debounced save
    debouncedSaveToS3(currentFile.path, value);
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


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-white">
                {repl?.name}
                {unsavedFiles.size > 0 && (
                  <span className="ml-2 text-sm text-yellow-400">
                    ({unsavedFiles.size} unsaved {unsavedFiles.size === 1 ? 'change' : 'changes'})
                  </span>
                )}
              </h1>
              <span className="text-sm px-2 py-1 bg-gray-700 rounded">
                {repl?.language}
              </span>
              {domain && (
                <span className="text-sm px-2 py-1 bg-green-700 rounded">
                  {domain}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTerminal}
                className={`px-3 py-2 ${showTerminal ? 'bg-gray-600' : 'bg-gray-700'} text-white rounded-md hover:bg-gray-600 transition-colors flex items-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                Terminal
              </button>
              <button
                onClick={togglePreview}
                className={`px-3 py-2 ${showPreview ? 'bg-gray-600' : 'bg-gray-700'} text-white rounded-md hover:bg-gray-600 transition-colors flex items-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                </svg>
                Preview
              </button>
              <button
                onClick={() => {/* TODO: Add run functionality */ }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        <FileTreeExplorer onFileSelect={handleFileSelect} socket={socket} />
        <div className="flex-1 flex flex-col">
          <div className={`flex-1 ${showTerminal || showPreview ? 'h-1/2' : 'h-full'}`}>
            {currentFile ? (
              <Editor
                height="100%"
                defaultLanguage={currentFile.name.split('.').pop()}
                theme="vs-dark"
                value={fileContent}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a file to edit
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {showTerminal && (
            <div className="h-1/2 border-t border-gray-700">
              <Terminal socket={socket} />
            </div>
          )}

          {/* Preview Panel */}
          {showPreview && (
            <div className="h-1/2 border-t border-gray-700 bg-white  ">
              {previewAvailable ? (
                <iframe
                  src={`http://${domain}/`}
                  className="w-full h-full border-none"
                  title="Preview"
                  sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-800 text-gray-400">
                  <div className="text-center p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-semibold">Nothing to Preview</p>
                    <p className="max-w-md mt-2">
                      There's no website running at port 5173 in your worker container.
                      Launch a web server on port 5173 to see a preview here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplEditor;

