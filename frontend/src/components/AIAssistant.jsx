import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Code,
  Sparkles,
  Loader2
} from 'lucide-react';

const AIAssistant = ({ currentFile, fileContent, onApplyChanges, editorRef }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [mode, setMode] = useState('chat'); // chat, explain, complete
  const responseRef = useRef(null);

  // Listen for editor selection changes
  useEffect(() => {
    console.log('Setting up selection listeners');
    console.log('Editor ref:', editorRef);
    
    // Wait for editor to be available
    if (!editorRef?.current) {
      console.log('Editor not available yet, waiting...');
      return;
    }

    const editor = editorRef.current;
    console.log('Editor instance:', editor);
    
    if (!editor.getModel()) {
      console.log('Editor model not available yet');
      return;
    }

    const model = editor.getModel();
    console.log('Editor model:', model);

    const updateSelection = () => {
      const selection = editor.getSelection();
      console.log('Current selection:', selection);
      if (selection && !selection.isEmpty()) {
        const text = model.getValueInRange(selection);
        console.log('Selected text:', text);
        setSelectedCode(text);
      } else {
        setSelectedCode('');
      }
    };

    // Listen for cursor position changes which also includes selection changes
    const cursorChangeDisposable = editor.onDidChangeCursorPosition((e) => {
      console.log('Cursor position changed:', e);
      updateSelection();
    });

    // Initial selection check
    updateSelection();

    return () => {
      console.log('Cleaning up selection listeners');
      cursorChangeDisposable.dispose();
    };
  }, [editorRef?.current]); // Only re-run when editorRef.current changes

  // Debug log for selected code changes
  useEffect(() => {
    console.log('Selected code state updated:', selectedCode);
  }, [selectedCode]);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (responseRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = responseRef.current;
      const isAtBottom = scrollHeight - clientHeight - scrollTop < 100;
      
      if (isAtBottom) {
        responseRef.current.scrollTop = scrollHeight;
      }
    }
  }, [aiResponse]);

  const streamResponse = async (endpoint, data) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ai/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              accumulatedResponse += data.text;
              setAiResponse(accumulatedResponse);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      setAiResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAISubmit = async () => {
    if (!aiPrompt.trim() || !currentFile) return;

    setIsAiLoading(true);
    setAiResponse('');
    await streamResponse('assist', {
      prompt: aiPrompt,
      fileContent: fileContent,
      filePath: currentFile.path,
      language: currentFile.name.split('.').pop()
    });
  };

  const handleExplainCode = async () => {
    if (!selectedCode || !currentFile) return;

    setIsAiLoading(true);
    setAiResponse('');
    await streamResponse('explain', {
      selectedCode,
      filePath: currentFile.path,
      language: currentFile.name.split('.').pop()
    });
  };

  const handleCompleteCode = async () => {
    if (!currentFile || !aiPrompt.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');
    const position = editorRef.current?.getPosition();
    console.log('Completing code at position:', position);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ai/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent: fileContent,
          filePath: currentFile.path,
          language: currentFile.name.split('.').pop(),
          cursorPosition: position ? position.lineNumber : 0,
          prompt: aiPrompt
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              console.log('Parsing JSON:', jsonStr);
              const data = JSON.parse(jsonStr);
              console.log('Parsed data:', data);
              if (data.text) {
                accumulatedResponse += data.text;
                setAiResponse(accumulatedResponse);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
              console.error('Problematic line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error completing code:', error);
      setAiResponse('Sorry, there was an error completing your code.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyChanges = (value) => {
    if (aiResponse.includes('```')) {
      const codeMatch = aiResponse.match(/```[\s\S]*?```/);
      if (codeMatch) {
        // Get the code content and split into lines
        const code = codeMatch[0].replace(/```/g, '').trim();
        const lines = code.split('\n');
        
        // Skip the first line if it contains a language identifier
        const firstLine = lines[0].trim().toLowerCase();
        const languageIdentifiers = ['python', 'javascript', 'jsx', 'css', 'html', 'typescript', 'tsx', 'js'];
        const shouldSkipFirstLine = languageIdentifiers.some(lang => firstLine === lang);
        
        // Join the lines back together, skipping the first line if needed
        const finalCode = shouldSkipFirstLine ? lines.slice(1).join('\n') : code;
        onApplyChanges(finalCode);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
        {/* Header */}
        <div className="border-b border-gray-700 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-200">AI Assistant</h2>
        </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('chat')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'chat' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMode('explain')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'explain' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            >
              Explain
            </button>
            <button
              onClick={() => setMode('complete')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'complete' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            >
              Complete
            </button>
          </div>
        </div>

        {/* Response Area */}
        <div 
          ref={responseRef}
          className="flex-1 p-4 overflow-y-auto"
        >
          {aiResponse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-700 rounded-lg p-4 mb-4"
          >
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap break-words">{aiResponse}</pre>
              </div>
              {aiResponse.includes('```') && (
                <button
                  onClick={() => handleApplyChanges(aiResponse)}
                className="mt-2 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                <Code className="h-4 w-4" />
                  Apply Changes
                </button>
              )}
          </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          {mode === 'explain' ? (
            <div className="space-y-2">
            <div className="bg-gray-700 p-3 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">Selected Code:</p>
              <pre className="text-sm overflow-x-auto max-h-32 bg-gray-800 p-2 rounded">{selectedCode || 'No code selected'}</pre>
              </div>
              <button
                onClick={handleExplainCode}
                disabled={!selectedCode || isAiLoading}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isAiLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                <>
                  <Bot className="h-5 w-5" />
                  Explain Selected Code
                </>
                )}
              </button>
            </div>
          ) : mode === 'complete' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what you want in this file..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleCompleteCode}
                disabled={!aiPrompt.trim() || isAiLoading}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isAiLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                <>
                  <Code className="h-5 w-5" />
                  Complete Code
                </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask AI to help with your code..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAISubmit()}
              />
              <button
                onClick={handleAISubmit}
                disabled={isAiLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isAiLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send
                </>
                )}
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default AIAssistant; 