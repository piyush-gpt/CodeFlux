import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

const Terminal = ({ socket }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Initialize terminal
    const initTerminal = () => {
      // Create xterm instance
      xtermRef.current = new XTerminal({
        cursorBlink: true,
        macOptionIsMeta: true,
        scrollback: 1000,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#f0f0f0',
          cursor: '#aeafad',
          selection: 'rgba(170, 170, 170, 0.3)',
        }
      });

      // Create fit addon
      fitAddonRef.current = new FitAddon();
      xtermRef.current.loadAddon(fitAddonRef.current);
      
      // Create web links addon
      const webLinksAddon = new WebLinksAddon();
      xtermRef.current.loadAddon(webLinksAddon);

      // Open the terminal
      xtermRef.current.open(terminalRef.current);
      
      // Initialize terminal size and fit content
      setTimeout(() => {
        fitAddonRef.current.fit();
        const dimensions = {
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows
        };
        socket.emit('terminal:resize', dimensions);
      }, 100);

      // Welcome message
      xtermRef.current.writeln('\x1b[1;34m Welcome to the terminal! \x1b[0m');
      xtermRef.current.writeln('\x1b[1;32m You are in the /workspace directory. \x1b[0m');
      xtermRef.current.writeln('');

      // Handle terminal input
      xtermRef.current.onData(data => {
        socket.emit('terminal:input', data);
      });

      // Handle window resize
      const handleResize = () => {
        if (fitAddonRef.current) {
          try {
            fitAddonRef.current.fit();
            const dimensions = {
              cols: xtermRef.current.cols,
              rows: xtermRef.current.rows
            };
            socket.emit('terminal:resize', dimensions);
          } catch (err) {
            console.error('Error resizing terminal:', err);
          }
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    // Listen for terminal output from the server
    socket.on('terminal:output', (data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    // Initialize the terminal
    const cleanup = initTerminal();

    // Connect to terminal 
    socket.emit('terminal:start');

    // Cleanup when component unmounts
    return () => {
      if (cleanup) cleanup();
      socket.off('terminal:output');
      socket.emit('terminal:stop');
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [socket]);

  // Handle resize when terminal container size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        setTimeout(() => {
          try {
            fitAddonRef.current.fit();
            if (xtermRef.current && socket) {
              socket.emit('terminal:resize', {
                cols: xtermRef.current.cols,
                rows: xtermRef.current.rows
              });
            }
          } catch (err) {
            console.error('Error in resize observer:', err);
          }
        }, 0);
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [socket]);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm font-semibold">
        Terminal
      </div>
      <div 
        ref={terminalRef} 
        className="flex-1 overflow-hidden bg-[#1e1e1e]"
      />
    </div>
  );
};

export default Terminal; 