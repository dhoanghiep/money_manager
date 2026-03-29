# 💰 Money Manager

A personal money manager web app deployed on GitHub Pages, backed by Google Sheets via Google Apps Script.

---

## Features

- **Dashboard** — income/expense summary with charts, switchable by week / month / quarter / year
- **Calendar** — month and week views with transaction dots per day
- **Transactions** — full list with search and filters (type, category, account)
- **Categories** — built-in + custom expense/income categories with colors and icons
- **Accounts** — cash, bank, credit card, savings, custom accounts
- **Dark mode** — toggle persisted across sessions
- **No login** — accessed via your private GitHub Pages URL

---

## Setup

### Step 1 — Google Apps Script (backend)

1. Create a new **Google Spreadsheet**
2. Go to **Extensions → Apps Script**
3. Paste the contents of `gas/Code.gs` into `Code.gs`
4. Run **`setupSheets()`** — creates the 3 required sheets with headers
5. Run **`seedDefaultData()`** — populates default categories and accounts
6. Click **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the deployment URL (looks like `https://script.google.com/macros/s/LONG_ID/exec`)

### Step 2 — Environment

```bash
cp .env.example .env
```

Edit `.env` and paste your GAS deployment URL:

```
VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### Step 3 — Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/money_manager/`

### Step 4 — Deploy to GitHub Pages

1. Push the repo to GitHub (keep it **private** to protect your GAS URL)
2. Run:
   ```bash
   npm run deploy
   ```
3. In GitHub: **Settings → Pages → Source: `gh-pages` branch**
4. Your app is live at: `https://YOUR_USERNAME.github.io/money_manager/#/`

---

## Security

- The GAS URL is your "private link" — it's a long opaque ID
- `.env` is gitignored — never committed
- **Keep the GitHub repo private** — the built JS in the `gh-pages` branch contains the baked-in GAS URL

---

## Data Model

### Google Sheets

| Sheet | Columns |
|-------|---------|
| Transactions | id, date, amount, type, categoryId, accountId, note, createdAt, updatedAt |
| Categories | id, name, color, icon, type, isDefault |
| Accounts | id, name, color, icon, type, initialBalance, isDefault |

---

## Tech Stack

- **Frontend**: React 18, Vite 5, TailwindCSS 3, React Router 6 (HashRouter), Recharts 2, date-fns 3
- **Backend**: Google Apps Script (Web App)
- **Database**: Google Sheets
- **Deployment**: gh-pages → GitHub Pages
