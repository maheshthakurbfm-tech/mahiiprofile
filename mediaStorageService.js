/**
 * MAHESH THAKUR PORTFOLIO — MEDIA STORAGE SERVICE
 * Adapted from MAH CRM Storage Architecture (storageService.ts)
 * 
 * Features:
 * - Direct cloud storage uploads (Cloudinary CDN with unsigned preset)
 * - Byte-by-byte XMLHttpRequest progress events (1% to 100%)
 * - Support for large files (videos up to 500MB, images up to 50MB)
 * - Automatic media type & MIME detection
 * - Permanent, secure HTTPS URL generation for persistent rendering
 * - No local filesystem dependency (100% Vercel & cloud production compatible)
 */

(function(window) {
  const CLOUD_NAME = 'esvwgoxe';
  const UPLOAD_PRESET = 'esvwgoxe';
  const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit

  /**
   * Determine media category from filename or MIME type
   * Replicates MAH CRM getMediaType()
   */
  function getMediaType(filename, mimeType) {
    const mime = (mimeType || '').toLowerCase();
    const lower = (filename || '').toLowerCase();

    if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(lower)) {
      return 'image';
    }
    if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|mkv)$/i.test(lower)) {
      return 'video';
    }
    if (mime === 'application/pdf' || /\.pdf$/i.test(lower)) {
      return 'pdf';
    }
    if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(lower)) {
      return 'audio';
    }
    return 'other';
  }

  /**
   * Format byte size into human-readable string
   * Replicates MAH CRM formatFileSize()
   */
  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Upload a media file directly to persistent cloud storage (Cloudinary)
   * Uses XMLHttpRequest for real byte-by-byte upload progress events
   * 
   * @param {File} file - The file to upload
   * @param {string} folder - Destination folder / category (e.g. 'portfolio-projects', 'thumbnails')
   * @param {Function} onProgress - Progress callback function (progressPercent: number, loadedBytes: number, totalBytes: number)
   * @returns {Promise<Object>} Upload result with stable public URL
   */
  function uploadMediaFile(file, folder, onProgress) {
    return new Promise((resolve, reject) => {
      // 1. Validate File
      if (!file || !(file instanceof File)) {
        return reject(new Error('Invalid file provided for upload.'));
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return reject(new Error(`File "${file.name}" exceeds maximum allowed size of 500 MB (${formatFileSize(file.size)}).`));
      }

      // Determine resource endpoint
      const mediaType = getMediaType(file.name, file.type);
      let resourceType = 'image';
      if (mediaType === 'video') {
        resourceType = 'video';
      } else if (mediaType === 'audio' || mediaType === 'pdf' || mediaType === 'other') {
        resourceType = 'raw';
      }

      const targetFolder = folder || 'portfolio-projects';

      // 2. Prepare Multipart Form Data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', targetFolder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl, true);
      xhr.timeout = 300000; // 5 minutes timeout for large video files

      // Real byte-by-byte upload progress
      if (xhr.upload && typeof onProgress === 'function') {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
            onProgress(percent, e.loaded, e.total);
          }
        });
      }

      xhr.onload = function() {
        let data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (_) {
          return reject(new Error(`Invalid JSON response from Cloudinary (HTTP ${xhr.status})`));
        }

        if (xhr.status >= 200 && xhr.status < 300 && data && (data.secure_url || data.url)) {
          if (typeof onProgress === 'function') onProgress(100, file.size, file.size);

          resolve({
            url: data.secure_url || data.url,
            name: file.name,
            size: file.size,
            bytes: data.bytes || file.size,
            formattedSize: formatFileSize(data.bytes || file.size),
            type: mediaType,
            resourceType: data.resource_type || resourceType,
            format: data.format || file.name.split('.').pop().toLowerCase(),
            width: data.width,
            height: data.height,
            duration: data.duration ? Math.round(data.duration) : undefined,
            publicId: data.public_id,
            assetId: data.asset_id || ('cld_' + Date.now()),
            uploadedAt: data.created_at || new Date().toISOString(),
            storageBackend: 'cloudinary'
          });
        } else {
          const errorMsg = (data && data.error && data.error.message) 
            ? data.error.message 
            : `Cloudinary upload failed with HTTP status ${xhr.status}`;
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = function() {
        reject(new Error('Network error during Cloudinary upload. Please check your internet connection.'));
      };

      xhr.ontimeout = function() {
        reject(new Error('Upload timed out after 5 minutes. The file may be too large or connection too slow.'));
      };

      xhr.onabort = function() {
        reject(new Error('Upload was aborted.'));
      };

      xhr.send(formData);
    });
  }

  /**
   * Check if a URL represents a playable direct video stream
   */
  function isDirectVideoUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    const url = rawUrl.trim().toLowerCase();
    
    // Strip query parameters for extension checking
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // 1. Direct extensions
    if (/\.(mp4|webm|mov|m4v|ogg|mkv)$/i.test(cleanUrl)) return true;
    
    // 2. Cloudinary video URLs
    if (url.includes('cloudinary.com/') && (url.includes('/video/upload/') || url.includes('/video/'))) return true;
    
    // 3. Firebase Storage video URLs
    if (url.includes('firebasestorage.googleapis.com') && (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video'))) return true;
    
    return false;
  }

  // Export to global window object
  window.MediaStorageService = {
    uploadMediaFile,
    getMediaType,
    formatFileSize,
    isDirectVideoUrl,
    cloudName: CLOUD_NAME,
    uploadPreset: UPLOAD_PRESET
  };

})(typeof window !== 'undefined' ? window : this);
