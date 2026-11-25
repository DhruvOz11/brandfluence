# Brandfluence API

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGO_URI`, `JWT_SECRET`, and `ADMIN_PASSWORD`.
3. Configure SMTP as described below to enable password reset emails.
4. Start the API with `npm start`.

Creator and brand sessions expire after 1 day by default or 7 days when “Remember me” is selected. Admin sessions expire after 1 hour or 8 hours when remembered. Password-reset links are single-use and expire after 15 minutes. Reset requests are rate limited.

## Configure Gmail SMTP for password reset

For a local demo, Gmail SMTP can be used without adding another mail service:

1. Sign in to the Google account that will send Brandfluence reset emails and enable 2-Step Verification.
2. Open the Google Account **App passwords** page and create an app password for Brandfluence. If App passwords is unavailable for that account, use another SMTP provider instead.
3. Edit `server/.env` (not the client `.env`) and set the mail values. Keep the password private:

   ```env
   CLIENT_URL=http://localhost:3000
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-sender@gmail.com
   SMTP_PASS=your-16-character-app-password
   MAIL_FROM="Brandfluence <your-sender@gmail.com>"
   ```

4. Save the file and restart the API so it reloads the environment variables.
5. On the login page, select **Forgot password?**, enter the email address of an existing creator or brand account, and submit. Check the sender mailbox and spam folder for the link.
6. Open the link within 15 minutes, choose a password with at least 8 characters, then sign in with the new password.

Do not use the normal Google account password for `SMTP_PASS`, and do not commit or share `server/.env`. Without all required SMTP settings, the forgot-password endpoint reports that email is not configured. Gmail sending availability and quotas depend on the account.

## Campaign workflow

Brands create campaign requests with a title, brief, deliverables, positive budget, and due date. Creators can accept or decline a pending request. After acceptance, the brand starts the campaign; the creator submits completed work with a note; the brand confirms completion.

The API enforces participant ownership and each role's allowed next status, so stale requests cannot skip or repeat a transition. Both dashboards show the campaign details, status history, and the next action available to that user. Older campaign records remain visible using their saved charges and time limit as display fallbacks.

## Campaign chat

The standalone chat inbox is available to campaign participants from their creator or brand dashboard. Text messages are stored per campaign, limited to 2,000 characters and 60 sends per user per minute, and the latest 100 messages are returned when opening a conversation. Unread messages are marked read when that conversation is opened; the client refreshes conversations and active messages periodically, so a separate WebSocket service is not required for the local demo.

Either participant may block the chat. A block by either side prevents new messages from both sides while preserving message history as read-only; it does not change campaign status. Participants can unblock themselves, but messaging stays disabled while the other participant remains blocked. Reports are saved as open moderation records for the admin moderation module.

Conversation lists, headers, and message bubbles show each participant's profile image when available, with a default avatar otherwise.

## Verification and moderation

Creators can request platform verification from their profile page by providing public-profile evidence or context. Do not collect government identity documents. Admins can approve or reject pending requests with a recorded reason, search creator and brand accounts, suspend/reactivate an account, and review or dismiss chat reports. Each moderation decision is recorded in the activity log. Suspended accounts cannot log in or use protected APIs; reactivation requires signing in again.

Verification is an admin review label, not a guarantee of audience size or engagement. Follower totals remain self-reported. Blocking in chat remains a participant-level messaging control and is separate from administrator account suspension.

## Profile images

Creators can replace their profile picture from **My profile and portfolio**. Brands can upload or replace their company logo from the brand dashboard. Both use `POST /api/users/me/profile-image` with an authenticated creator or brand session and a multipart `image` field. JPG, PNG, and WebP files up to 5 MB are accepted; the server checks the file signature before saving. `GET /api/users/me/profile` returns the signed-in account's profile image path.

Run the API tests with `npm test`.
