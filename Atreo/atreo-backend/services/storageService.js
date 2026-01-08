const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

/**
 * Uploads a file to Google Cloud Storage
 * @param {Object} file - The file object from multer
 * @param {string} destination - The path/filename in the bucket
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
const uploadFile = async (file, destination) => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(destination);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', async () => {
      // The public URL can be used to directly access the file via HTTP.
      // Note: This requires the bucket or file to be public (Storage Object Viewer for allUsers)
      // or using signed URLs if private.
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};

/**
 * Deletes a file from Google Cloud Storage
 * @param {string} fileName - The name/path of the file in the bucket
 */
const deleteFile = async (fileName) => {
  try {
    await bucket.file(fileName).delete();
  } catch (error) {
    console.error(`Error deleting file ${fileName} from GCS:`, error);
  }
};

/**
 * Generates a signed URL for a file in Google Cloud Storage
 * @param {string} fileUrl - The public URL or path of the file
 * @param {number} expires - Expiration time in minutes (default 15)
 * @returns {Promise<string>} - The signed URL
 */
const getSignedUrl = async (fileUrl, expires = 15) => {
  try {
    if (!fileUrl) return null;

    // Extract filename from URL if it's a full GCS URL
    let fileName = fileUrl;
    if (fileUrl.startsWith('https://storage.googleapis.com/')) {
      const parts = fileUrl.split('/');
      // Skip the domain and bucket name parts
      fileName = parts.slice(4).join('/');
    } else if (fileUrl.startsWith('/uploads/')) {
      // Handle legacy local paths - convert to GCS path
      // Remove leading slash and 'uploads/' prefix since files are stored directly in bucket
      fileName = fileUrl.replace(/^\/uploads\//, '');
    }

    const [url] = await bucket.file(fileName).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expires * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    // Fallback to original URL if signing fails
    return fileUrl;
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  getSignedUrl,
};
