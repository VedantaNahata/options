---
description: How to run the OptiX Options Analytics Platform locally
---

## Prerequisites
- Node.js 18+ installed
- Python 3.10+ installed
- Groww Trade API access token

## Steps

### 1. Configure Backend
1. Navigate to `backend/.env`
2. Replace `your_access_token_here` with your actual Groww API access token

### 2. Install Backend Dependencies
// turbo
```
cd backend && pip install -r requirements.txt
```

### 3. Start Backend Server
```
cd backend && python main.py
```
The backend will start on http://localhost:8000

### 4. Install Frontend Dependencies (if not already done)
// turbo
```
cd frontend && npm install
```

### 5. Start Frontend Dev Server
// turbo
```
cd frontend && npm run dev
```
The frontend will start on http://localhost:3000

### 6. Access the App
- Landing page: http://localhost:3000
- Option Chain: http://localhost:3000/option-chain

## Notes
- **API calls are LAZY**: No API calls are made until the user navigates to a specific route
- The app works in demo mode with mock data even without the backend running
- The backend serves as a proxy to the Groww API, with PCR/MaxPain calculations
