/**
 * Cloudflare Worker API for R2 Media System
 * Features:
 * - Admin Auth Validation
 * - S3/R2 Presigned PUT Upload URL Generation
 * - Remote URL Import & Direct R2 Stream
 * - R2 Asset Index & Metadata Management
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const jsonResp = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    };

    // Authentication Helper
    const authenticate = (req) => {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
      const token = authHeader.substring(7);
      const secretKey = env.ADMIN_SECRET_KEY || 'admin123';
      return token === secretKey;
    };

    try {
      // 1. GET /api/status - Connection Status
      if (path === '/api/status' && request.method === 'GET') {
        const isBucketBound = !!env.MY_BUCKET;
        const publicDomain = env.PUBLIC_MEDIA_DOMAIN || 'https://media.maheshthakur.com';
        return jsonResp({
          cloudflareConnected: true,
          r2Connected: isBucketBound,
          bucketName: env.BUCKET_NAME || 'mahesh-portfolio-media',
          publicDomainConfigured: !!env.PUBLIC_MEDIA_DOMAIN,
          publicDomain,
        });
      }

      // 2. POST /api/auth/login - Admin Login
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json();
        const secretKey = env.ADMIN_SECRET_KEY || 'admin123';
        if (body.password === secretKey) {
          return jsonResp({ success: true, token: secretKey });
        } else {
          return jsonResp({ success: false, error: 'Invalid admin credentials' }, 401);
        }
      }

      // Protection Check for Write Routes
      if (path.startsWith('/api/upload') || path.startsWith('/api/import') || path.startsWith('/api/media')) {
        if (request.method !== 'GET' && !authenticate(request)) {
          return jsonResp({ error: 'Unauthorized request' }, 401);
        }
      }

      // 3. POST /api/upload-url - Generate Direct Upload Endpoint
      if (path === '/api/upload-url' && request.method === 'POST') {
        const { fileName, fileType, fileSize } = await request.json();
        
        if (!fileName || !fileType) {
          return jsonResp({ error: 'Missing fileName or fileType' }, 400);
        }

        const ext = fileName.split('.').pop().toLowerCase();
        const safeId = 'med_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const folder = getFolderByExt(ext);
        const objectKey = `${folder}/${safeId}.${ext}`;

        // Return R2 Direct Upload URL endpoint handled by worker PUT handler
        const uploadUrl = `${url.origin}/api/direct-upload/${objectKey}`;
        const publicUrl = env.PUBLIC_MEDIA_DOMAIN 
          ? `${env.PUBLIC_MEDIA_DOMAIN}/${objectKey}`
          : `${url.origin}/media/${objectKey}`;

        return jsonResp({
          uploadUrl,
          objectKey,
          assetId: safeId,
          publicUrl,
          folder,
        });
      }

      // 4. PUT /api/direct-upload/* - Direct R2 Upload Endpoint
      if (path.startsWith('/api/direct-upload/') && request.method === 'PUT') {
        if (!authenticate(request)) {
          return jsonResp({ error: 'Unauthorized direct upload' }, 401);
        }
        const objectKey = path.replace('/api/direct-upload/', '');
        const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

        if (env.MY_BUCKET) {
          await env.MY_BUCKET.put(objectKey, request.body, {
            httpMetadata: { contentType },
          });
        }

        return jsonResp({ success: true, objectKey });
      }

      // 5. POST /api/import-url - Remote URL Import
      if (path === '/api/import-url' && request.method === 'POST') {
        const { remoteUrl, action } = await request.json();
        if (!remoteUrl) return jsonResp({ error: 'Missing remoteUrl' }, 400);

        if (action === 'USE_EXTERNAL') {
          const safeId = 'ext_' + Date.now();
          return jsonResp({
            success: true,
            asset: {
              id: safeId,
              name: remoteUrl.split('/').pop().split('?')[0] || 'External Media',
              type: 'external',
              size: 'External',
              publicUrl: remoteUrl,
              isExternal: true,
              uploadDate: new Date().toISOString(),
            }
          });
        }

        // Fetch & Stream to R2
        try {
          const remoteResp = await fetch(remoteUrl);
          if (!remoteResp.ok) throw new Error(`HTTP ${remoteResp.status}`);

          const contentType = remoteResp.headers.get('content-type') || 'application/octet-stream';
          const contentLength = remoteResp.headers.get('content-length') || 'Unknown';
          const fileName = remoteUrl.split('/').pop().split('?')[0] || 'imported_file';
          const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : 'bin';
          
          const safeId = 'med_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const folder = getFolderByExt(ext);
          const objectKey = `${folder}/${safeId}.${ext}`;

          if (env.MY_BUCKET) {
            await env.MY_BUCKET.put(objectKey, remoteResp.body, {
              httpMetadata: { contentType },
            });
          }

          const publicUrl = env.PUBLIC_MEDIA_DOMAIN 
            ? `${env.PUBLIC_MEDIA_DOMAIN}/${objectKey}`
            : `${url.origin}/media/${objectKey}`;

          return jsonResp({
            success: true,
            asset: {
              id: safeId,
              name: fileName,
              type: contentType,
              size: contentLength !== 'Unknown' ? formatBytes(parseInt(contentLength)) : 'Unknown',
              objectKey,
              publicUrl,
              isExternal: false,
              uploadDate: new Date().toISOString(),
            }
          });
        } catch (err) {
          return jsonResp({ error: `Failed to import remote asset: ${err.message}` }, 400);
        }
      }

      // 6. GET /media/* - Public R2 Media Proxy Route
      if (path.startsWith('/media/') && request.method === 'GET') {
        const objectKey = path.replace('/media/', '');
        if (!env.MY_BUCKET) {
          return new Response('R2 Bucket not bound', { status: 404 });
        }
        const object = await env.MY_BUCKET.get(objectKey);
        if (!object) return new Response('Asset not found', { status: 404 });

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000');
        return new Response(object.body, { headers });
      }

      return jsonResp({ error: 'Endpoint not found' }, 404);

    } catch (e) {
      return jsonResp({ error: e.message }, 500);
    }
  }
};

function getFolderByExt(ext) {
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'media/videos';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'media/images';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'media/audio';
  if (['pdf', 'doc', 'docx', 'zip'].includes(ext)) return 'media/documents';
  return 'media/general';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
