import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
const s3 = new S3Client({
  region: "auto",
  endpoint:  process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});



export async function copyS3Folder(sourcePrefix, destinationPrefix) {
  const bucket = process.env.AWS_BUCKET_NAME;

  let continuationToken = undefined;

  try {
    do {
      let result;

      try {
        
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: sourcePrefix,
          ContinuationToken: continuationToken,
        });

        result = await s3.send(listCommand);
      } catch (listError) {
        console.error("❌ Error listing objects:", listError.message);
        return;
      }

      const objects = result.Contents || [];

      try {
        await Promise.all(objects.map(async (obj) => {
          if (!obj.Key || obj.Key.endsWith("/")) return; // Skip placeholder folders

          const relativePath = obj.Key.substring(sourcePrefix.length);
          const destinationKey = `${destinationPrefix}${relativePath}`;

          console.log(`📁 Copying: ${obj.Key} → ${destinationKey}`);

          try {
            await s3.send(new CopyObjectCommand({
              Bucket: bucket,
              CopySource: `/${bucket}/${obj.Key}`,
              Key: destinationKey,
            }));
          } catch (copyError) {
            console.error(`⚠️ Failed to copy ${obj.Key}:`, copyError.message);
          }
        }));
      } catch (batchCopyError) {
        console.error("❌ Error during copying batch:", batchCopyError.message);
      }

      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    console.log("✅ Done copying all files.");
  } catch (err) {
    console.error("❌ Unexpected error during folder copy:", err.message);
  }
}



export async function directoryExists(prefix) {
  const bucket = process.env.AWS_BUCKET_NAME;

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
      MaxKeys: 1,
    });

    const result = await s3.send(command);

    return result.Contents && result.Contents.length > 0;
  } catch (err) {
    console.error(`❌ Error checking if directory "${prefix}" exists:`, err.message);
    return false;
  }
}

export async function deleteFromS3(userId, replId, targetPath) {
  const bucket = process.env.AWS_BUCKET_NAME;
  const s3KeyPrefix = `code/${userId}/${replId}/`;

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: s3KeyPrefix,
    });

    const listResult = await s3.send(listCommand);

    if (!listResult.Contents || listResult.Contents.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const deleteObjects = {
      Bucket: bucket,
      Delete: {
        Objects: listResult.Contents.map((item) => ({ Key: item.Key })),
        Quiet: false,
      },
    };

    const deleteCommand = new DeleteObjectsCommand(deleteObjects);
    const deleteResult = await s3.send(deleteCommand);

    return {
      success: true,
      deletedCount: deleteResult.Deleted?.length || 0,
    };
  } catch (error) {
    console.error(`Error deleting from S3:`, error.message);
    return { success: false, error: error.message };
  }
}