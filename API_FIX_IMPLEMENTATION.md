# ERP Frontend API Configuration Fix - Complete Implementation Guide

## Problem
All frontend components have **hardcoded** `http://localhost:5000` URLs which cause `ERR_CONNECTION_REFUSED` errors in production and make the app fail when the backend server is down.

## Solution
We created a **centralized API configuration file** (`apiConfig.js`) that dynamically determines the backend URL based on the environment.

---

## Step 1: Verify apiConfig.js Exists

The file `frontend/src/utils/apiConfig.js` has already been created. It contains:
- Dynamic backend URL detection
- All API endpoints as constants
- Support for environment variables

---

## Step 2: Update Component Files

You need to update the following files to use the new API configuration:

### 2.1 Enquiry.jsx
**Location:** `frontend/src/component/Enquiry.jsx`

**Change:** Line 23 (in handleSubmit function)

**OLD CODE:**
```javascript
const response = await fetch("http://localhost:5000/api/enquiries", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData),
});
```

**NEW CODE:**
```javascript
import { API_ENDPOINTS } from "../utils/apiConfig";

// ... in handleSubmit function:
const response = await fetch(API_ENDPOINTS.ENQUIRIES, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData),
});
```

---

### 2.2 Apply.jsx
**Location:** `frontend/src/component/Apply.jsx`

**Change:** Line 26 (in handleSubmit function)

**OLD CODE:**
```javascript
const base = window.__BACKEND_URL__ || 'http://localhost:5000';
const res = await fetch(`${base}/api/applications`, { method: "POST", body: fd });
```

**NEW CODE:**
```javascript
import { BACKEND_URL } from "../utils/apiConfig";

// ... in handleSubmit function:
const res = await fetch(API_ENDPOINTS.APPLICATIONS, { method: "POST", body: fd });
```

---

### 2.3 Applications.jsx
**Location:** `frontend/src/component/Applications.jsx`

**Change:** Line 13 (in fetchApplications function)

**OLD CODE:**
```javascript
const res = await fetch('http://localhost:5000/api/applications');
```

**NEW CODE:**
```javascript
import { API_ENDPOINTS } from "../utils/apiConfig";

const res = await fetch(API_ENDPOINTS.APPLICATIONS);
```

**Also Update:** Line 24 (in deleteApplication function)

**OLD CODE:**
```javascript
const res = await fetch(`http://localhost:5000/api/applications/${id}`, { method: 'DELETE' });
```

**NEW CODE:**
```javascript
const res = await fetch(API_ENDPOINTS.DELETE_APPLICATION(id), { method: 'DELETE' });
```

---

### 2.4 QuotationDashboard.jsx
**Location:** `frontend/src/component/QuotationDashboard.jsx`

**Find and Replace ALL instances:**
```javascript
import { API_ENDPOINTS } from "../utils/apiConfig";

// Replace all fetch calls:
// Old: fetch('http://localhost:5000/api/quotations')
// New: fetch(API_ENDPOINTS.QUOTATIONS)
```

---

### 2.5 SalarySlipGenerator.jsx
**Location:** `frontend/src/component/SalarySlipGenerator.jsx`

**Replace:**
```javascript
import { API_ENDPOINTS } from "../utils/apiConfig";

// Old: fetch('http://localhost:5000/api/salary-slips')
// New: fetch(API_ENDPOINTS.SALARY_SLIPS)
```

---

### 2.6 LeaveRequestPage.jsx
**Location:** `frontend/src/component/LeaveRequestPage.jsx`

**Replace ALL hardcoded URLs:**
```javascript
import { API_ENDPOINTS } from "../utils/apiConfig";

// Old: fetch('http://localhost:5000/api/leaves')
// New: fetch(API_ENDPOINTS.LEAVES)
```

---

### 2.7 LeaveApprovals.jsx
**Location:** `frontend/src/component/LeaveApprovals.jsx`

**Replace:**
```javascript
import { API_ENDPOINTS } from "../utils/apiConfig";
```

---

## Step 3: Create .env File in Frontend

**Location:** `frontend/.env`

**Content:**
```
VITE_BACKEND_URL=http://localhost:5000
```

**For Production (Render):**
```
VITE_BACKEND_URL=https://your-erp-backend.onrender.com
```

---

## Step 4: Update Frontend index.html (Optional)

**Location:** `frontend/public/index.html`

Add before closing `</head>` tag:
```html
<script>
  // Fallback for production backend URL
  window.__BACKEND_URL__ = process.env.VITE_BACKEND_URL || 'http://localhost:5000';
</script>
```

---

## Step 5: Start Backend Server

```bash
cd backend
npm install
npm start
# Should see: "Server running on port 5000"
```

---

## Step 6: Start Frontend Server

```bash
cd frontend
npm install
npm run dev
# Should see: "Local: http://localhost:5173"
```

---

## Testing Checklist

✅ Enquiry form submits successfully
✅ Job application submits successfully
✅ Admin can view applications
✅ Quotations can be created and updated
✅ Salary slips can be generated
✅ Leave requests can be submitted and approved
✅ No `ERR_CONNECTION_REFUSED` errors in console

---

## Production Deployment

### For Render Frontend:
1. Update `.env` with your actual backend URL
2. Commit and push to GitHub
3. Render will automatically redeploy

### For Render Backend:
Ensure environment variable is set:
```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
CORS_ORIGIN=https://your-erp-frontend.onrender.com
```

---

## Quick Fix Summary

| File | Change | Impact |
|------|--------|--------|
| apiConfig.js | ✅ Already created | Centralized API config |
| Enquiry.jsx | Import + use API_ENDPOINTS.ENQUIRIES | Fix connection error |
| Apply.jsx | Import + use API_ENDPOINTS.APPLICATIONS | Fix application submission |
| Applications.jsx | Import + use API_ENDPOINTS | Fix app viewing |
| QuotationDashboard.jsx | Import + use API_ENDPOINTS | Fix quotation page |
| SalarySlipGenerator.jsx | Import + use API_ENDPOINTS | Fix salary slip page |
| LeaveRequestPage.jsx | Import + use API_ENDPOINTS | Fix leave page |
| .env | Add VITE_BACKEND_URL | Production support |

---

## Troubleshooting

### Still getting ERR_CONNECTION_REFUSED?
1. Ensure backend is running: `npm start` in /backend
2. Check if port 5000 is actually listening: `netstat -an | grep 5000`
3. Check browser console for exact error
4. Verify CORS is enabled in backend

### Variables not loading?
1. Restart `npm run dev` after changing `.env`
2. Check `import.meta.env` in browser console
3. Ensure no typos in VITE_ prefix (required for Vite)

---

## Support
For issues, check:
- Browser Console (F12)
- Network tab for failed requests
- Backend terminal for error messages
