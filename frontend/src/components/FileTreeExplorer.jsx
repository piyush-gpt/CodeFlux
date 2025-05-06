import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Trash2,
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

  const renderTree = (parentPath, depth = 0) => {
    return fileTree
      .filter((item) => item.parent === parentPath)
      .map((item) => (
        <div key={item.path} className="pl-4">
          <div
            className={`flex items-center gap-2 cursor-pointer group hover:bg-gray-700 p-1 rounded ${
              selectedFile === item.path ? "bg-gray-700" : ""
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
              className="flex items-center gap-1 flex-1"
            >
              {item.type === "folder" ? (
                item.isOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )
              ) : (
                <div className="w-4" />
              )}
              {item.type === "folder" ? (
                <Folder size={16} />
              ) : (
                <FileText size={16} />
              )}
              <span className="truncate">{item.name}</span>
            </div>
            <Trash2
              size={14}
              onClick={() => deleteItem(item.path)}
              className="text-red-500 hover:text-red-700 hidden group-hover:inline-block"
            />
          </div>
          {item.isOpen && item.type === "folder" && (
            <>
              <div
                className="pl-6 py-1 text-xs text-blue-500 cursor-pointer"
                onClick={() => addItem(item.path, "file")}
              >
                + Add File
              </div>
              <div
                className="pl-6 py-1 text-xs text-blue-500 cursor-pointer"
                onClick={() => addItem(item.path, "folder")}
              >
                + Add Folder
              </div>
              {renderTree(item.path, depth + 1)}
            </>
          )}
        </div>
      ));
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
      <h2 className="font-semibold text-lg mb-4 flex justify-between items-center">
        File Explorer
        <button
          className="text-blue-500 hover:underline text-sm"
          onClick={() => addItem("workspace", "file")}
        >
          + File
        </button>
        <button
          className="text-blue-500 hover:underline text-sm"
          onClick={() => addItem("workspace", "folder")}
        >
          + Folder
        </button>
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-400"></div>
        </div>
      ) : (
        renderTree("workspace")
      )}

      <button
        onClick={() => {
          setIsLoading(true);
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
          socket.emit("runnerLoaded");
        }}
        className="mt-4 text-xs text-blue-400 hover:text-blue-500 w-full text-center"
      >
        Refresh File Explorer
      </button>
    </div>
  );
}
