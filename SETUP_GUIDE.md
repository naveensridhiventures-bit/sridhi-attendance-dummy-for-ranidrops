# 🌧️ Raindrops Attendance PWA — Setup Guide

## Your Sheet ID (already embedded in the script)
```
1Bn9djAIVy4GDEIDn5GN1580c_wcc8Iv2YNwx6kn9AO0
```

---

## Step 1: Paste the Apps Script (5 minutes)

1. Open your Google Sheet → **Extensions → Apps Script**
2. Delete ALL existing code in the editor
3. Paste the entire `GOOGLE_APPS_SCRIPT.js` file (Sheet ID is already filled in)
4. Click **Save** (💾 icon)
5. Click **Deploy → New Deployment**
6. Settings:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** → **Authorize** → Copy the **Web App URL**

The URL looks like:
```
https://script.google.com/macros/s/AKfycb.../exec
```

> ⚠️ Save this URL — you need it in Step 2

---

## Step 2: Configure the App

Create a file called `.env` in the project root folder:

```
REACT_APP_API_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

Paste your URL from Step 1 there.

---

## Step 3: Deploy to Render (Free Static Site)

1. Push this folder to a GitHub repository
2. Go to [render.com](https://render.com) → **New → Static Site**
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Environment Variable**: Add `REACT_APP_API_URL` = your Apps Script URL
5. Click **Create Static Site**

Render will build and deploy. No cold starts — it's a static site!

---

## Your Sheet Tab Structure (must match exactly)

| Tab Name | What it does |
|---|---|
| `Employees` | Employee list — Name, Role, Salary, Advance, Active, Password, DOB |
| `June-2026 Attendance` | Auto-created by app on first mark |
| `June-2026 Salary` | Calculated by app |

**Employees tab column order** (from your sheet):
- A: Name
- B: Role
- C: Monthly Salary
- D: Advance
- E: Active (YES / NO)
- F: Password
- G: Date of Birth

---

## Status & Salary Rules

| Status | Meaning | Pay |
|---|---|---|
| P | Present | 1× per day |
| A | Absent | 0 |
| WO | Week Off (Sunday) | 1× per day (paid holiday) |
| WOP | Worked on Week Off | 2× per day (double) |
| NA | Not Available / Relieved | 0 |

**Formula:**
```
Per Day  = Monthly Salary ÷ Days in Month
Paid Days = P + WO + (WOP × 2)
Gross    = Per Day × Paid Days
Net      = Gross − Advance
```

---

## Troubleshooting

**App shows "Could not load" for employees**
→ Make sure the `Employees` tab exists with header in row 1 and `Active = YES`

**Attendance not saving**
→ Re-deploy the Apps Script as a NEW deployment (not update existing)

**Slow first load**
→ Apps Script has a ~1-3s cold start. After first call it's fast. The app caches results for 5 min.

**Employee deleted from sheet but still showing in app**
→ Set their `Active` column to `NO` in the sheet, then pull-to-refresh in app

