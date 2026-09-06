# Cloudflare Worker & R2 One-Time Deployment Guide

This guide details the one-time Cloudflare setup required to connect your portfolio's Admin Panel directly to Cloudflare Worker API & Cloudflare R2 Storage.

---

## 1. Create Cloudflare R2 Storage Bucket
1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. On the left sidebar, click **R2** ➔ **Overview**.
3. Click **Create Bucket**.
4. Set Bucket Name: `mahesh-portfolio-media`.
5. Click **Create Bucket**.

---

## 2. Connect Custom Media Domain (Optional / Recommended)
1. Inside your `mahesh-portfolio-media` bucket settings, scroll to **Custom Domains**.
2. Click **Connect Domain**.
3. Enter your preferred domain (e.g. `media.maheshthakur.com`).
4. Update `wrangler.toml` variable `PUBLIC_MEDIA_DOMAIN` with your custom domain:
   ```toml
   PUBLIC_MEDIA_DOMAIN = "https://media.maheshthakur.com"
   ```

---

## 3. Configure Worker Secrets (Security)
Run the following commands in your terminal to set your secret production password and keys:

```bash
# 1. Set Production Admin Password (Replaces default password)
npx wrangler secret put ADMIN_SECRET_KEY

# 2. Deploy Worker to Cloudflare
npx wrangler deploy
```

---

## 4. How to Manage Media After Setup
Once deployed, you never need to log into Cloudflare Dashboard for ordinary media tasks:
1. Open your portfolio website and unlock the **Admin Panel**.
2. Go to **📁 Media Library** tab:
   - Click **⬆ Direct Upload File** to drag & drop MP4, WebM, PNG, JPG, WebP, SVG, MP3, or PDF files.
   - Or paste a video URL and click **[ IMPORT & HOST ]** or **[ USE EXTERNAL URL ]**.
3. Go to **Projects** tab:
   - Click **📁 Pick Media** next to Video URL or Thumbnail URL to link R2 assets directly to your projects.
4. Click **Save Changes**.
