# 🧪 Firebase Storage Upload Test Plan

## ✅ Configuration Status

- ✅ `memoryStorage()` configured in `profile.js` routes
- ✅ `updateAvatar()` has Firebase integration + fallback
- ✅ `firebase-service-account.json` has real credentials
- ✅ `firebaseStorageService.js` properly initializes Firebase Admin SDK
- ✅ Default avatar URL: `https://storage.googleapis.com/tabletalk-social.firebasestorage.app/profile-images/default-avatar.jpg`

## 📋 Local Testing Checklist

### 1. Start Backend Locally

```bash
cd BACKEND
npm install  # if needed
npm run dev
# or
node app.js
```

Expected: Backend starts on `http://localhost:5000`

### 2. Start Frontend Locally

```bash
cd FRONTEND/client
npm install  # if needed
npm start
# or
npm run build && npm run serve
```

Expected: Frontend starts on `http://localhost:3000`

### 3. Test Avatar Upload Flow

```
1. Open http://localhost:3000
2. Go to profile page (or login first)
3. Click "Cambia foto profilo" or avatar upload button
4. Select any image file
5. Click upload

Expected Results:
✅ File uploaded successfully (no error)
✅ Image displays on profile
✅ Check browser DevTools → Network → PUT /api/profile/me/avatar
   - Should return 200
   - Response should have imageUrl in Firebase Storage
✅ Check backend logs for:
   - "✅ [UpdateAvatar] Avatar aggiornato con successo"
   - "✅ [Firebase Storage] Immagine caricata: https://storage.googleapis.com/..."
```

### 4. Verify Image Persistence

```bash
# After uploading avatar:
1. Refresh the page (F5)
2. Image should still be there (loaded from Firebase)

3. Close and re-open browser
4. Login again
5. Go to profile
6. Image should still be there (persisted in Firebase Storage)

Expected: Image persists across reloads ✅
```

### 5. Check Firebase Storage Console

Go to: https://console.firebase.google.com/project/tabletalk-social/storage

1. Click on "Files" tab
2. Navigate to `profile-images/` folder
3. Should see uploaded images with names like: `1234567890_filename.jpg`
4. Click on image → click "Copy public URL"
5. Should match the URL returned by backend

Expected: Images visible in Firebase Storage ✅

## 🚀 Deploy to Render

Once local testing passes:

```bash
cd TableTalk mEat Together - Apple
git add BACKEND/firebase-service-account.json
git add BACKEND/services/firebaseStorageService.js
git add BACKEND/controllers/profileController.js
git add BACKEND/routes/profile.js

git commit -m "feat: implement Firebase Storage for profile images

- Switch multer to memoryStorage for consistent buffer handling
- Integrate Firebase Storage upload/delete in updateAvatar
- Update deleteProfileImage to use Firebase Storage
- Proper error handling and logging"

git push origin main
```

Wait for Render to redeploy (~2-3 minutes).

## 🧪 Production Testing on Render

```
1. Open https://tabletalk-app-frontend.onrender.com
2. Login or register
3. Go to profile
4. Upload avatar
5. Verify upload works (check response)
6. Refresh page
7. Image should persist
8. Check logs on Render dashboard:
   Render → Logs → search for "[UpdateAvatar]"
```

## ⚠️ Common Issues

### Issue: "ENOENT: no such file or directory firebase-service-account.json"

**Solution:** File is in `BACKEND/` directory. Check:
```bash
ls BACKEND/firebase-service-account.json
# Should exist
```

### Issue: "Cannot read property 'bucket' of undefined"

**Solution:** Firebase not initialized. Check:
1. `firebase-service-account.json` has real credentials
2. `FIREBASE_STORAGE_BUCKET` env var or default is correct
3. `project_id` in credentials matches bucket

### Issue: File uploaded but image doesn't show

**Solution:** Check CORS headers. Firebase Storage should allow:
- Origin: `https://tabletalk-app-frontend.onrender.com`
- Origin: `http://localhost:3000` (for local dev)

### Issue: "Access Denied" when uploading

**Solution:** Firebase Storage security rules. Check:
https://console.firebase.google.com/project/tabletalk-social/storage/rules

Rules should allow public read and authenticated write (for now).

## ✨ Success Criteria

- ✅ Upload without error
- ✅ Image URL returned from backend (Firebase public URL)
- ✅ Image displays on profile
- ✅ Image persists after page refresh
- ✅ Image visible in Firebase Storage console
- ✅ Backend logs show successful upload
- ✅ Works locally and on Render

## Next Steps

After profile images work:
- [ ] Apply same Firebase Storage to meal images
- [ ] Update `BACKEND/controllers/mealController.js` for meal photos
- [ ] Test meal image uploads
- [ ] Update chat attachments to use Firebase (if applicable)
