import fs from 'fs/promises';
import path from 'path';
/**
 * Create a new file or folder
 * @param {string} filePath - Path to create
 * @param {boolean} isFolder - Whether it's a folder or file
 * @returns {Promise<boolean>} - Success status
 */
async function createFile(filePath, isFolder = false) {
  try {
    // For files, ensure the parent directory exists
    const directory = isFolder ? filePath : path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
    
    // If it's a file (not a folder), create an empty file
    if (!isFolder) {
      await fs.writeFile(filePath, '', 'utf8');
    }
    
    return true;
  } catch (error) {
    console.error(`Error creating ${isFolder ? 'folder' : 'file'} at ${filePath}:`, error);
    throw error;
  }
}

/**
 * Get the contents of a directory 
 * @param {string} relativePath - The path relative to the container root (e.g. "workspace/user/repl")
 * @returns {Promise<Array>} - Array of file/folder objects
 */
async function fetchDir(relativePath) {
  try {
    console.log('Fetching directory contents for:', relativePath);
    const entries = await fs.readdir(relativePath, { withFileTypes: true });
    
    // Map entries to objects with name and type only
    const contents = entries.map(entry => {
      const isDirectory = entry.isDirectory();
      return {
        name: entry.name,
        type: isDirectory ? 'folder' : 'file'
      };
    });
    
    // Sort folders first, then files, both alphabetically
    contents.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    console.log("isnide the function after fetching")
    return contents;
  } catch (error) {
    console.error(`Error fetching directory contents for ${relativePath}:`, error);
    return [];
  }
}

/**
 * Read file contents
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File contents
 */
async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Write content to a file
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @returns {Promise<boolean>} - Success status
 */
async function writeFile(filePath, content) {
  try {
    // Ensure the directory exists
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
    
    
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete a file or folder (recursively)
 * @param {string} filePath - Path to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      // Recursively delete directory contents
      const files = await fs.readdir(filePath);
      
      for (const file of files) {
        const currentPath = path.join(filePath, file);
        const currentStats = await fs.stat(currentPath);
        
        if (currentStats.isDirectory()) {
          await deleteFile(currentPath); // Recursively delete subdirectories
        } else {
          await fs.unlink(currentPath); // Delete files
        }
      }
      
      // Delete the now-empty directory
      await fs.rmdir(filePath);
      console.log(`Deleted directory: ${filePath}`);
    } else {
      // Delete the file
      await fs.unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
    }
    
    return true;
  } catch (error) {
    // If the file doesn't exist, consider it a success 
    if (error.code === 'ENOENT') {
      console.log(`File or directory already doesn't exist: ${filePath}`);
      return true;
    }
    
    console.error(`Error deleting file/folder at ${filePath}:`, error);
    throw error;
  }
}


export  {
  createFile,
  readFile,
  writeFile,
  deleteFile,
  fetchDir
};
