# Deployment Guide

This guide covers deployment for both the backend (Railway) and frontend (Vercel).

## 🚂 Backend Deployment (Railway)

### Prerequisites
- Railway account
- MongoDB database (Railway MongoDB or MongoDB Atlas)
- GitHub repository connected to Railway

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `invisiedge/Atreo`
5. Set the **Root Directory** to: `Atreo/atreo-backend`

### Step 2: Configure Environment Variables

Add these environment variables in Railway:

```env
# Server
PORT=3001
NODE_ENV=production

# Database (MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://lokeshmv_db_user:dKsaYc3gdQBIk8H0@invisiedge.ac0dzm7.mongodb.net/atreo-development?retryWrites=true&w=majority

# JWT (CRITICAL - Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# Google Cloud Storage (Optional - for file storage)
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

### Step 3: Deploy

Railway will automatically:
1. Detect Node.js project
2. Run `npm ci` (from railway.json)
3. Start with `npm start`
4. Expose the service on a public URL

### Step 4: Get Backend URL

After deployment, Railway will provide a URL like:
```
https://your-app-name.up.railway.app
```

Your API will be available at:
```
https://your-app-name.up.railway.app/api
```

### Troubleshooting Backend Issues

**Issue: Build fails with `npm ci` error**
- Solution: Ensure `package-lock.json` is committed and up to date
- Run `npm install` locally and commit the updated lock file

**Issue: Server not starting**
- Check logs in Railway dashboard
- Verify `JWT_SECRET` is set
- Verify `MONGODB_URI` is correct
- Check if port is correctly set (Railway auto-assigns PORT)

**Issue: CORS errors**
- Ensure `FRONTEND_URL` matches your Vercel deployment URL exactly
- Check that the URL doesn't have a trailing slash

---

## ▲ Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Step 1: Create Vercel Project

1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository: `invisiedge/Atreo`
4. Vercel will auto-detect Vite configuration

### Step 2: Configure Build Settings

Vercel should auto-detect these from `vercel.json`:
- **Framework Preset**: Vite
- **Root Directory**: `Atreo` (or leave blank if repo root is `Atreo/`)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`

### Step 3: Configure Environment Variables

Add these environment variables in Vercel:

```env
# API Base URL (Your Railway backend URL)
VITE_API_BASE_URL=https://your-app-name.up.railway.app/api
```

**Important**: 
- Use `https://` not `http://`
- Include `/api` at the end
- No trailing slash after `/api`

### Step 4: Deploy

1. Click "Deploy"
2. Vercel will:
   - Install dependencies with `npm ci`
   - Build with `npm run build`
   - Deploy to production

### Step 5: Get Frontend URL

After deployment, Vercel will provide a URL like:
```
https://atreo.vercel.app
```

### Troubleshooting Frontend Issues

**Issue: Build fails with TypeScript errors**
- Run `npm run build` locally to check for errors
- Fix any TypeScript errors before deploying
- Ensure all type definitions are correct

**Issue: API calls failing**
- Verify `VITE_API_BASE_URL` is set correctly
- Check browser console for CORS errors
- Ensure backend `FRONTEND_URL` matches Vercel URL

**Issue: 404 errors on routes**
- Verify `vercel.json` has the rewrite rule for SPA routing
- Check that `outputDirectory` is set to `dist`

---

## 🔗 Connecting Frontend to Backend

### 1. Update Backend CORS

In Railway, set `FRONTEND_URL` to your Vercel URL:
```
FRONTEND_URL=https://atreo.vercel.app
```

### 2. Update Frontend API URL

In Vercel, set `VITE_API_BASE_URL` to your Railway URL. You can use either format:

**Option 1 (Recommended - Full URL with /api):**
```
VITE_API_BASE_URL=https://your-app-name.up.railway.app/api
```

**Option 2 (Just the domain - protocol will be added automatically):**
```
VITE_API_BASE_URL=your-app-name.up.railway.app/api
```

**Note:** The code will automatically:
- Add `https://` protocol if missing (or `http://` for localhost)
- Ensure the URL ends with `/api`

### 3. Test Connection

1. Deploy both services
2. Open frontend in browser
3. Check browser console for API errors
4. Try logging in to test the connection

---

## 📋 Environment Variables Checklist

### Backend (Railway) - Required
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)
- [ ] `FRONTEND_URL` - Your Vercel frontend URL

### Backend (Railway) - Optional
- [ ] `OPENAI_API_KEY` - For AI features
- [ ] `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` - For email
- [ ] `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_PROJECT_ID` - For cloud storage

### Frontend (Vercel) - Required
- [ ] `VITE_API_BASE_URL` - Your Railway backend API URL

---

## 🚀 Quick Deploy Commands

### Backend (Railway)
```bash
# Railway auto-deploys on git push
git push origin main
```

### Frontend (Vercel)
```bash
# Vercel auto-deploys on git push
git push origin main
```

Or use Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

---

## 🔍 Verification Steps

After deployment, verify:

1. **Backend Health Check**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```
   Should return: `{"status":"OK","timestamp":"..."}`

2. **Frontend Loads**
   - Visit your Vercel URL
   - Should see the login page

3. **API Connection**
   - Try logging in
   - Check browser Network tab for API calls
   - Verify responses are successful

---

## 📝 Notes

- **Node Version**: Both projects use Node 18 (specified in `.nvmrc`)
- **Package Manager**: Uses `npm ci` for clean installs
- **Build**: Frontend builds to `dist/` directory
- **Port**: Backend uses `PORT` env var (Railway auto-assigns)
- **CORS**: Backend must have frontend URL in allowed origins

---

## 🆘 Support

If you encounter issues:
1. Check Railway/Vercel deployment logs
2. Verify all environment variables are set
3. Check that `package-lock.json` files are committed
4. Ensure Node version compatibility (18.x)

