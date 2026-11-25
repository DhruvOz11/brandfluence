# Deploy Brandfluence: GitHub + Railway + Netlify

This project is a React app in `client/` and an Express/MongoDB API in `server/`.
The instructions below use one private GitHub repository for both deploys.

## Before you start

- Check your employer's rules before putting company-owned code or data in a
  personal GitHub account or on free hosting. Never upload company secrets,
  customer data, or production credentials.
- Create accounts with the same GitHub account for Railway and Netlify, then
  authorize each service to access this repository. A different Google or
  GitHub account is not needed for the two deployments.
- You need a MongoDB connection string (for example, from a MongoDB Atlas
  database). Keep it private.

## 1. Put the project on GitHub

1. On GitHub, create a **private** repository. Do not initialize it with a
   README, `.gitignore`, or license.
2. Open a terminal in the project root (the folder containing `client/` and
   `server/`) and run:

   ```powershell
   git init
   git add .
   git status --short
   ```

   Review the staged files. `server/.env`, `node_modules/`, build output, and
   `server/uploads/` should not appear. If they do, stop and check `.gitignore`
   before committing.
3. Make the first commit and push to the empty GitHub repository:

   ```powershell
   git commit -m "Initial project"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

   If Git asks, configure your commit name/email with `git config`.
   `.gitignore` prevents future additions from being staged; it cannot remove
   a secret that was already committed. If a secret was ever pushed, rotate it.

## 2. Deploy the API on Railway

1. In Railway, create a project from the GitHub repository and select the
   `server` directory as the service's **Root Directory**.
2. Use `npm start` as the start command (the server package already defines
   this). Deploy once and generate a public domain in the service's networking
   settings.
3. Add these variables in the Railway service's **Variables** settings:

   | Variable | Value |
   | --- | --- |
   | `MONGO_URI` | Your MongoDB connection string |
   | `JWT_SECRET` | A long, random secret |
   | `ADMIN_PASSWORD` | A strong, unique admin password |
   | `CLIENT_URL` | Your Netlify site origin, e.g. `https://your-site.netlify.app` |

   Generate a random secret locally in PowerShell with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   If you use password-reset email, also set `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. Do not use your
   normal Google password; use an app password or another SMTP provider.
4. In MongoDB Atlas, create a database user and allow the Railway service to
   connect. Use a strong database password and restrict network access where
   practical.

The API reads Railway's `PORT` automatically. Its public domain will look like
`https://your-api.up.railway.app`; use that origin (without `/api`) in the next
step.

## 3. Deploy the frontend on Netlify

1. Add a new Netlify site by importing the same GitHub repository.
2. Set the **Base directory** to `client`, the **Build command** to
   `npm run build`, and the **Publish directory** to `build`.
3. Add this site environment variable before deploying:

   | Variable | Value |
   | --- | --- |
   | `REACT_APP_API_URL` | Your Railway API origin, e.g. `https://your-api.up.railway.app` |

4. Deploy the site and copy its `https://...netlify.app` origin. Set Railway's
   `CLIENT_URL` to that exact origin (no trailing slash), then redeploy/restart
   the Railway service.
5. Test signup/login, an API-backed page, and opening a page directly by URL.
   The included `client/public/_redirects` sends React Router paths back to the
   app.

After connecting both services to the repository, pushes to the production
branch (usually `main`) trigger new deployments automatically. Check that
Railway's autodeploy branch and Netlify's production branch are both set to
`main`. Future updates are:

```powershell
git add .
git commit -m "Describe your change"
git push
```

## Free-plan and storage caveats

- Free allowances and eligibility change. As checked on **November 25, 2026**,
  Railway lists a $1/month usage credit on its Free plan and says services can
  sleep after several idle minutes; Netlify lists a 300-credit Free plan.
  Check their current [Railway pricing](https://railway.com/pricing) and
  [Netlify pricing](https://www.netlify.com/pricing/) before relying on a
  no-cost production setup.
- Using a different Google/GitHub account does not guarantee another free
  allowance. Don't create accounts to bypass provider limits or terms. Keep
  the repo and deploys under accounts you control and can recover.
- User media is written under `server/uploads/`. The ignore rule keeps local
  uploads out of GitHub; Railway's service filesystem is not a substitute for
  durable file storage. Uploaded files may be lost on redeploy/restart unless
  you configure a persistent volume or move uploads to object storage. The
  Railway Free plan currently lists a 0.5 GB volume limit.
- These free services are suitable for a demo, not a production availability
  guarantee. Monitor usage, database limits, and provider billing.
