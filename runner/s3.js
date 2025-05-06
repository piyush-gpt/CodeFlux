import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand
} from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const normalizePath = (filePath) => {
  return filePath.replace(/^\//, '').replace(/^workspace\//, '');
};

/**
 * Create a new file or folder in S3
 * @param {string} userId - User ID
 * @param {string} replId - Repl ID
 * @param {string} newPath - Path of the new file/folder (e.g., workspace/folder/file.txt)
 * @returns {Promise<Object>} - Result of the operation
 */
export async function createFileInS3(userId, replId, newPath,type) {
  const bucket = process.env.AWS_BUCKET_NAME;
  
  
  const normalizedPath = normalizePath(newPath);
  
  const isFolder = type === 'folder';
  
  let s3Key = `code/${userId}/${replId}/${normalizedPath}`;
  
  // For folders, add a trailing slash if not present
  if (isFolder && !s3Key.endsWith('/')) {
    s3Key += '/';
  }
  
  try {
    console.log(`📝 Creating ${isFolder ? 'folder' : 'file'} in S3: ${s3Key}`);
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: isFolder ? '' : '', 
      ContentType: isFolder ? 'application/x-directory' : getContentType(s3Key),
    });
    
    const result = await s3.send(command);
    
    console.log(`✅ ${isFolder ? 'Folder' : 'File'} created successfully: ${s3Key}`);
    return {
      success: true,
      etag: result.ETag,
      key: s3Key,
      isFolder
    };
  } catch (error) {
    console.error(`❌ Error creating ${isFolder ? 'folder' : 'file'} in S3 (${s3Key}):`, error.message);
    return {
      success: false,
      error: error.message,
      isFolder
    };
  }
}

/**
 * Save file content to S3/R2
 * @param {string} userId - User ID
 * @param {string} replId - Repl ID
 * @param {string} filePath - Path of the file relative to workspace
 * @param {string} content - File content to save
 * @returns {Promise<Object>} - Result of the operation
 */
export async function saveToS3(userId, replId, filePath, content) {
  const bucket = process.env.AWS_BUCKET_NAME;
  
  // Remove any leading slashes or 'workspace/' from filePath
  const normalizedFilePath = normalizePath(filePath);
  
  const s3Key = `code/${userId}/${replId}/${normalizedFilePath}`;
  
  try {
    console.log(`📝 Saving file to S3: ${s3Key}`);
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: content,
      ContentType: getContentType(filePath),
    });
  
    const result = await s3.send(command);
    
    console.log(`✅ File saved successfully: ${s3Key}`);
    return {
      success: true,
      etag: result.ETag,
      key: s3Key
    };
  } catch (error) {
    console.error(`❌ Error saving file to S3 (${s3Key}):`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * @param {string} filePath - Path of the file
 * @returns {string} - MIME content type
 */
function getContentType(filePath) {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  const contentTypes = {
    // Web related
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    
    // Text formats
    'txt': 'text/plain',
    'md': 'text/markdown',
    
    // Programming languages
    'py': 'text/x-python',
    'python': 'text/x-python',
    'java': 'text/x-java-source',
    'c': 'text/x-c',
    'cpp': 'text/x-c++src',
    'cc': 'text/x-c++src',
    'h': 'text/x-c',
    'hpp': 'text/x-c++hdr',
    'cs': 'text/x-csharp',
    'rb': 'text/x-ruby',
    'php': 'application/x-php',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'ts': 'application/typescript',
    'jsx': 'application/javascript',
    'tsx': 'application/typescript',
    
    // Image formats
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    
    // Other formats
    'pdf': 'application/pdf',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml'
  };
  
  return contentTypes[extension] || 'application/octet-stream';
}

/**
 * Delete a file or folder (and its contents) from S3
 * @param {string} userId - User ID
 * @param {string} replId - Repl ID
 * @param {string} targetPath - Path to delete
 * @returns {Promise<Object>} - Result of the operation
 */
export async function deleteFromS3(userId, replId, targetPath) {
  const bucket = process.env.AWS_BUCKET_NAME;
  
  // Normalize the path
  const normalizedPath = normalizePath(targetPath);
  
  
  const s3KeyPrefix = `code/${userId}/${replId}/`;
  const s3Key = `${s3KeyPrefix}${normalizedPath}`;
  
  try {
    // Check if this is a folder by checking file extension and listing objects
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: s3Key,
    });
    
    const listResult = await s3.send(listCommand);
    
    // Determine if it's a folder:
    // 1. If there are objects with this prefix (more than the object itself), it's a folder
    // 2. Or if there's no file extension (like 'src' or 'components')
    const isFolder = (listResult.Contents && listResult.Contents.length >= 1 && !s3Key.includes('.')) || 
                    listResult.Contents && listResult.Contents.length > 1;
    
    if (isFolder) {
      console.log(`🗑️ Deleting folder and its contents from S3: ${s3Key}`);
      
      if (!listResult.Contents || listResult.Contents.length === 0) {
        console.log(`Folder appears empty or doesn't exist: ${s3Key}`);
        return { success: true, deletedCount: 0 };
      }
      
      // Delete all objects with this prefix (folder and its contents)
      const deleteObjects = {
        Bucket: bucket,
        Delete: {
          Objects: listResult.Contents.map(item => ({ Key: item.Key })),
          Quiet: false
        }
      };
      
      const deleteCommand = new DeleteObjectsCommand(deleteObjects);
      const deleteResult = await s3.send(deleteCommand);
      
      console.log(`✅ Deleted ${deleteResult.Deleted?.length || 0} objects from S3`);
      return {
        success: true,
        deletedCount: deleteResult.Deleted?.length || 0,
        errors: deleteResult.Errors || []
      };
    } else {
      // Delete a single file
      console.log(`🗑️ Deleting file from S3: ${s3Key}`);
      
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key
      });
      
      await s3.send(deleteCommand);
      console.log(`✅ File deleted successfully: ${s3Key}`);
      
      return {
        success: true,
        deletedCount: 1
      };
    }
  } catch (error) {
    console.error(`❌ Error deleting from S3 (${s3Key}):`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}