import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  FilePlus,
  FolderPlus,
  Loader2,
  RefreshCw
} from "lucide-react";

export default function FileTreeExplorer({ onFileSelect, socket }) {
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    let dataRequested = false;

    const init = async () => {
      setFileTree([
        {
          name: "workspace",
          path: "workspace",
          parent: null,
          type: "folder",
          isOpen: true,
          childrenLoaded: false
        }
      ]);

      setIsLoading(true);

      socket.on("loaded", (data) => {
        console.log("Loaded event received:", data);
        if (!data || !data.rootContent || !Array.isArray(data.rootContent)) {
          console.error("Invalid data format received:", data);
          setIsLoading(false);
          return;
        }

        const newItems = data.rootContent.map((item) => ({
          ...item,
          name: item.name,
          path: `workspace/${item.name}`,
          parent: "workspace",
          type: item.type,
          isOpen: false,
          childrenLoaded: false
        }));

        setFileTree((prev) => {
          const existingPaths = new Set(prev.map((item) => item.path));
          const uniqueNewItems = newItems.filter(
            (item) => !existingPaths.has(item.path)
          );
          return [...prev, ...uniqueNewItems];
        });

        setFileTree((prev) =>
          prev.map((item) =>
            item.path === "workspace" ? { ...item, childrenLoaded: true } : item
          )
        );

        setIsLoading(false);
        dataRequested = false;
      });

      if (socket.connected && !dataRequested) {
        console.log("Socket already connected, requesting initial data");
        dataRequested = true;
        socket.emit("runnerLoaded");
      }
    };

    init();

    return () => {
      socket.off("loaded");
      socket.off("connect");
    };
  }, [socket]);

  const loadFolder = async (path) => {
    return new Promise((resolve) => {
      socket.emit("fetchDir", path, (children) => {
        const newItems = children.map((item) => ({
          ...item,
          name: item.name,
          path: `${path}/${item.name}`,
          parent: path,
          type: item.type,
          isOpen: false,
          childrenLoaded: false
        }));

        setFileTree((prev) => {
          const existingPaths = new Set(prev.map((item) => item.path));
          const uniqueNewItems = newItems.filter(
            (item) => !existingPaths.has(item.path)
          );
          return [...prev, ...uniqueNewItems];
        });

        resolve();
      });
    });
  };

  const toggleFolder = async (folder) => {
    setFileTree((prev) =>
      prev.map((item) =>
        item.path === folder.path ? { ...item, isOpen: !item.isOpen } : item
      )
    );

    if (!folder.childrenLoaded) {
      await loadFolder(folder.path);
      setFileTree((prev) =>
        prev.map((item) =>
          item.path === folder.path ? { ...item, childrenLoaded: true } : item
        )
      );
    }
  };

  const handleFileClick = (file) => {
    if (file.type === "file") {
      setSelectedFile(file.path);
      onFileSelect(file);
    }
  };

  const addItem = (parentPath, type) => {
    const name = prompt(`Enter ${type} name:`);
    if (!name) return;

    const newPath = `${parentPath}/${name}`;

    if (fileTree.some((item) => item.path === newPath)) {
      alert("An item with this name already exists!");
      return;
    }

    const newItem = {
      name,
      path: newPath,
      parent: parentPath,
      type,
      isOpen: false,
      childrenLoaded: false
    };

    setFileTree((prev) => [...prev, newItem]);

    socket.emit("createFile", newPath, type, (response) => {
      if (!response || !response.success) {
        console.error(`Failed to create ${type}: ${newPath}`, response?.error);
        alert(`Failed to create ${type}. Please try again.`);
        setFileTree((prev) => prev.filter((item) => item.path !== newPath));
      } else {
        console.log(`${type} created successfully: ${newPath}`);
      }
    });
  };

  const deleteItem = (itemPath) => {
    const confirmed = window.confirm("Are you sure you want to delete this?");
    if (!confirmed) return;

    setFileTree((prev) =>
      prev.filter(
        (item) =>
          !(item.path === itemPath || item.path.startsWith(`${itemPath}/`))
      )
    );

    socket.emit("deleteFile", itemPath, (response) => {
      if (!response || !response.success) {
        console.error(`Failed to delete: ${itemPath}`, response?.error);
        alert(`Failed to delete. The file explorer will refresh.`);

        const workspaceItem = fileTree.find(
          (item) => item.path === "workspace"
        );
        if (workspaceItem) {
          loadFolder("workspace");
        }
      } else {
        console.log(`Deleted successfully: ${itemPath}`);
      }
    });
  };

  const refreshFileTree = () => {
    setIsLoading(true);
    const workspaceItem = fileTree.find(item => item.path === "workspace");
    if (workspaceItem) {
      loadFolder("workspace").then(() => {
        setIsLoading(false);
      });
    }
  };

  const renderTree = (parentPath, depth = 0) => {
    return fileTree
      .filter((item) => item.parent === parentPath)
      .map((item) => (
        <motion.div
          key={item.path}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pl-4"
        >
          <div
            className={`flex items-center gap-2 cursor-pointer group hover:bg-gray-700/50 p-1.5 rounded-lg transition-colors ${
              selectedFile === item.path ? "bg-gray-700/50" : ""
            }`}
          >
            <div
              onClick={() => {
                if (item.type === "folder") {
                  toggleFolder(item);
                } else {
                  handleFileClick(item);
                }
              }}
              className="flex items-center gap-1.5 flex-1"
            >
              {item.type === "folder" ? (
                <motion.div
                  animate={{ rotate: item.isOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={16} className="text-gray-400" />
                </motion.div>
              ) : (
                <div className="w-4" />
              )}
              {item.type === "folder" ? (
                <Folder size={16} className="text-blue-400" />
              ) : (
                <FileText size={16} className="text-gray-400" />
              )}
              <span className="truncate text-sm">{item.name}</span>
            </div>
            <AnimatePresence>
              {item.type === "folder" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(item.path, "file");
                    }}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  >
                    <FilePlus size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(item.path, "folder");
                    }}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  >
                    <FolderPlus size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteItem(item.path);
              }}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <AnimatePresence>
          {item.isOpen && item.type === "folder" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
              {renderTree(item.path, depth + 1)}
              </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      ));
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 mb-2">EXPLORER</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => addItem("workspace", "file")}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={() => addItem("workspace", "folder")}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={refreshFileTree}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Refresh file tree"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {renderTree("workspace")}
      </div>
    </div>
  );
}
