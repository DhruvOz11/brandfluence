$ErrorActionPreference = 'Stop'

$inputPath = 'D:\mini project sem 3\starter-kit-mini-project.docx'
$outputPath = 'D:\brandfluence\Brandfluence_Project_Report.docx'

$reportContent = @'
TITLE|ACKNOWLEDGEMENT
P|I express my sincere gratitude to my project guide, Prof. Ankit Patel, for valuable guidance, feedback and encouragement during the development of Brandfluence. His suggestions helped shape the project scope and improve the clarity of the implementation.
P|I thank the faculty and staff of the Information Technology Department, L. D. College of Engineering, for providing the academic environment and resources needed to complete this Semester III project.
P|I also acknowledge the open-source communities and maintainers behind React, Node.js, Express and MongoDB, whose tools made the implementation possible. Finally, I thank my family and friends for their support throughout the project.
P|This report describes the implemented system and its verified capabilities. Personal and institutional details follow the supplied report template.
---
TITLE|ABSTRACT
P|Brandfluence is a web-based platform designed to connect brands with social-media creators and support the collaboration lifecycle in one place. Brands can discover creators using profile attributes and filters, review portfolios, and send structured campaign requests. Creators can manage their public profile, publish portfolio work, respond to requests and submit completed work. Both participants can track campaign state and communicate through a campaign-linked inbox.
P|The application uses a React client and an Express REST API backed by MongoDB and Mongoose. Role-aware JWT authentication protects creator, brand and administrator features. Campaign status transitions are validated on the server, while the administrator workspace supports creator-verification decisions, account access controls, chat-report review and a moderation activity log. Password reset uses expiring, single-use tokens and optional SMTP delivery.
P|The project emphasizes a practical workflow, clear role separation and basic safeguards for accounts, uploads and user communication. The backend automated suite completed 38 tests successfully. The frontend utility suites completed five tests; the App suite did not run because react-router-dom was missing from the installed client dependencies at test time.
P|Keywords: influencer marketing, creator marketplace, campaign management, React, Express, MongoDB, JWT.
---
TITLE|TABLE OF CONTENTS
P|Preliminary pages
B|Acknowledgement ........................................................................ 4
B|Abstract ..................................................................................... 5
B|Table of contents ...................................................................... 6
B|List of figures and abbreviations ........................................... 7
H|Main chapters
B|1. Introduction .......................................................................... 8
B|2. Problem, objectives and scope ............................................. 9
B|3. Existing approaches and project gap .................................. 10
B|4. Feasibility and development methodology ........................... 11
B|5. Requirements analysis ....................................................... 12
B|6. Use cases and quality requirements ................................... 13
B|7. System architecture ........................................................... 14
B|8. Data design ............................................................................ 15
B|9. API and security design ...................................................... 16
B|10. User interface and implementation .................................. 17-20
B|11. Testing strategy and test execution .................................. 21-22
B|12. Conclusion and future enhancement ................................ 23
B|References and screenshot checklist ....................................... 24
P|Page numbers are based on the supplied template and this report layout. Refresh the table if pagination changes after adding screenshots.
---
TITLE|LIST OF FIGURES AND ABBREVIATIONS
H|Planned figures
B|Figure 1. Brandfluence landing page and role entry points (page 17).
B|Figure 2. Registration or sign-in screen (page 17).
B|Figure 3. Creator dashboard and campaign status (page 18).
B|Figure 4. Creator profile, portfolio and verification area (page 18).
B|Figure 5. Brand creator discovery and filters (page 19).
B|Figure 6. Campaign request form and campaign list (page 19).
B|Figure 7. Campaign chat inbox and conversation (page 20).
B|Figure 8. Administrator moderation workspace (page 20).
H|Abbreviations
B|API - Application Programming Interface; REST - Representational State Transfer; JWT - JSON Web Token; UI - User Interface; UX - User Experience; CRUD - Create, Read, Update, Delete; SMTP - Simple Mail Transfer Protocol; DB - Database.
P|Insert actual application screenshots at the yellow bracketed locations on pages 17-20. Captions are included with each placeholder. Use sample accounts and remove personal data before capturing.
---
TITLE|CHAPTER 1 - INTRODUCTION
H|1.1 Background
P|Social-media marketing relies on trusted creators who can communicate products and services to specific audiences. For a brand, finding a suitable creator and agreeing on campaign expectations can involve scattered profiles, messages and documents. Creators also need a clear way to present their work, communicate rates and track requests.
P|Brandfluence provides a shared web workspace for these activities. Brands browse creator profiles, refine the list by category, city, rate and follower count, and start a collaboration using a written brief, deliverables, budget and due date. Creators see incoming requests and decide whether to accept or decline.
H|1.2 Project purpose
P|The purpose is to demonstrate an end-to-end creator-brand collaboration workflow, from discovery and profile presentation through campaign execution, communication and completion. Administrative review functions support platform trust without treating a verification badge as proof of audience size or commercial performance.
H|1.3 Intended users
B|Brands: search for creators, issue campaign requests, monitor progress and confirm completion.
B|Creators: maintain profile and portfolio information, respond to campaigns and submit work.
B|Administrators: review verification requests, manage account access, handle chat reports and inspect recorded actions.
---
TITLE|CHAPTER 2 - PROBLEM, OBJECTIVES AND SCOPE
H|2.1 Problem statement
P|In a manual collaboration process, discovery, campaign details, progress updates and communication are separated across channels. This makes it difficult for either participant to know the current agreed scope or the next required action. A lightweight platform is needed to organize creator information and keep campaign decisions visible to the relevant parties.
H|2.2 Objectives
B|Create separate, authenticated experiences for creators, brands and administrators.
B|Enable searchable creator profiles with category, city, rate and follower filters.
B|Represent a campaign request with a brief, deliverables, positive budget and due date.
B|Enforce role-specific campaign transitions and retain a status history.
B|Provide profile and portfolio management, campaign-linked chat and moderation tools.
B|Validate uploaded media and protect sensitive account workflows with server-side checks.
H|2.3 Scope and boundaries
P|The implemented scope is a web application and REST API for the above workflows. It does not include payment processing, a public advertising marketplace, guaranteed influencer metrics, automatic campaign performance analytics, or a native mobile application. Follower totals are profile data and should be treated as self-reported; platform verification is an administrative review label.
---
TITLE|CHAPTER 3 - EXISTING APPROACHES AND PROJECT GAP
H|3.1 Current approach
P|Small brand-creator partnerships are often coordinated with social-media profiles, email, spreadsheets and direct messages. These tools are useful for communication but do not inherently share one campaign record with structured deliverables, a defined due date, role-specific approvals and an auditable status history.
H|3.2 Observed limitations
B|Creator details and work samples may be presented inconsistently across separate pages.
B|Campaign requirements can be difficult to compare when briefs are exchanged informally.
B|A message thread alone does not clearly indicate whether a request is pending, accepted, active or complete.
B|Moderation and verification decisions may not be visible as structured administrative actions.
H|3.3 Brandfluence contribution
P|Brandfluence brings profile discovery, campaign creation, participant decisions, progress history and campaign chat into the same application. Server-side authorization and transition rules complement the user interface. The design is intentionally a focused academic prototype; the project does not claim that it replaces social networks or provides independently audited audience analytics.
P|The functional comparison in this report is based on the implemented project features, not a commercial benchmark study. Evaluation focuses on whether the defined roles can complete the target workflow and whether the system stores and enforces the resulting state.
---
TITLE|CHAPTER 4 - FEASIBILITY AND DEVELOPMENT METHODOLOGY
H|4.1 Technical feasibility
P|The solution uses commonly available web technologies: React for the browser interface, Node.js and Express for the API, and MongoDB with Mongoose for persistent records. The API communicates using JSON over HTTP; uploaded media is served from the server uploads directory. Local development uses separate client and server processes.
H|4.2 Operational and economic feasibility
P|The system is designed for browser-based use and can be demonstrated on a standard development computer. The selected frameworks are open-source. A deployed environment still requires managed database, hosting, email and security configuration; those operating costs and production controls are outside this prototype report.
H|4.3 Method
P|Development followed an iterative approach: identify actor workflows, model user and campaign records, implement API routes and role checks, connect React pages to the API, and exercise behavior using automated tests. The campaign lifecycle was used as the central vertical slice, then extended with chat, profiles, verification, moderation and password reset.
H|4.4 Development environment
B|Client: React, React Router, Axios and CSS; local development default is port 3000.
B|Server: Node.js, Express, Mongoose, JWT, bcryptjs and Multer; default API port is 5000.
B|Database: MongoDB, configured by MONGO_URI.
B|Optional email: SMTP settings for password-reset delivery; secrets are stored in environment configuration, not source code.
---
TITLE|CHAPTER 5 - REQUIREMENTS ANALYSIS
H|5.1 Functional requirements
B|FR-01: A creator or brand can register and sign in to a role-specific account.
B|FR-02: A user can request a password reset; valid reset links expire and are single-use.
B|FR-03: Brands can filter and inspect creator profiles and portfolio items.
B|FR-04: Brands can create a campaign request with title, brief, deliverables, positive budget and due date.
B|FR-05: Creators can accept or decline pending requests and submit work for active campaigns.
B|FR-06: Brands can start accepted campaigns and confirm submitted work as completed.
B|FR-07: Participants can exchange campaign-linked messages, block chat and submit reports.
B|FR-08: Creators can maintain profile fields, profile image, portfolio media and verification evidence.
B|FR-09: Administrators can review verification, accounts, chat reports, activity and leaderboard data.
H|5.2 External interfaces
P|The React client calls the Express API with HTTP requests. Protected calls include a bearer JWT. Multipart requests carry profile or portfolio media. The API uses MongoDB for persistent application data and optional SMTP for reset emails. The browser interface adapts its layouts for common viewport sizes.
---
TITLE|CHAPTER 6 - USE CASES AND QUALITY REQUIREMENTS
H|6.1 Principal use cases
B|Brand: sign in, filter creators, open a profile, send campaign request, start work, message creator and confirm completion.
B|Creator: sign up, maintain public profile, upload portfolio items, request verification, accept or decline work, message brand and submit a completion note.
B|Administrator: sign in, inspect verification evidence, approve or reject with a reason, suspend or reactivate an account, and review or dismiss a chat report.
H|6.2 Quality requirements
B|Security: role checks, bearer-token validation, password hashing, scoped ownership checks and validation at the API boundary.
B|Reliability: campaign transitions use an expected current state so stale or repeated requests return a conflict rather than silently succeeding.
B|Usability: distinct dashboards, explicit status labels, form guidance, error messages and next-action controls.
B|Maintainability: client pages, server routes, models, middleware and file utilities are separated by responsibility.
B|Privacy: password reset responses avoid confirming whether an email belongs to an account; government identity documents are not requested for verification.
H|6.3 Assumptions
P|Users have a modern browser and network access to the application. Brands and creators provide accurate profile details and campaign commitments. SMTP is optional for password reset, while database and signing secrets are required to run the API.
---
TITLE|CHAPTER 7 - SYSTEM ARCHITECTURE
H|7.1 Three-part structure
P|The system follows a client-server pattern. The React single-page application renders role-specific pages and manages form state. Axios sends requests to Express routes. Authentication middleware validates bearer tokens, loads the account and checks the requested role before a protected route proceeds. Route handlers validate input and use Mongoose models to read or update MongoDB documents.
H|7.2 Request flow
B|1. Browser route renders a page and reads the current session token.
B|2. Client sends JSON or multipart data to the API endpoint.
B|3. Express middleware performs authentication and role validation.
B|4. The route validates inputs and participant ownership, then reads or updates MongoDB.
B|5. The API returns a JSON result or an explicit HTTP error; the client updates the view.
H|7.3 Main modules
P|Client modules include landing, creator and brand registration/login, creator dashboard and portfolio, brand dashboard and creator profile, campaign chat, admin workspace and password reset. Server route groups cover authentication, users, collaborations, chat and administration. Shared middleware handles authorization; models represent users, collaborations, messages, reports and moderation actions.
P|Campaign chat uses periodic HTTP refresh of conversations and messages rather than a WebSocket service. This keeps the local demonstration architecture simple while providing near-real-time updates.
---
TITLE|CHAPTER 8 - DATA DESIGN
H|8.1 Main collections
B|User: name, normalized email, password hash, role, creator profile attributes, image, portfolio, verification status and account-suspension fields.
B|Collaboration: brandId, creatorId, title, purpose, deliverables, budget, due date, status, submission note, chat block state and status history.
B|ChatMessage: collaborationId, senderId, recipientId, body, creation time and read time.
B|ChatReport: campaign reference, reporter, reported user, optional message, reason, review status and creation time.
B|ModerationAction: action type, subject, administrator actor, details and timestamp.
H|8.2 Relationships and constraints
P|A user has one of the roles creator, brand or admin. A collaboration references exactly one brand and one creator. Messages and reports reference a collaboration; a report can point to a specific message. A creator profile embeds an ordered portfolio array. Mongoose schema enums constrain role, campaign and moderation status values.
P|Campaign status history stores the status, actor, optional note and time of each transition. The API also checks the expected current state and participant identity during updates. These application-level constraints preserve the workflow beyond what a visual badge alone can guarantee.
H|8.3 Data handling
P|Passwords are stored as bcrypt hashes. Password-reset tokens are stored as SHA-256 hashes with an expiry. Uploaded media is written to the server uploads directory with generated names. File metadata and content signatures are validated before the account or portfolio record is updated.
---
TITLE|CHAPTER 9 - API AND SECURITY DESIGN
H|9.1 API groups
B|/api/auth: creator/brand signup and login, administrator login, forgot-password and reset-password operations.
B|/api/users: creator discovery and profile, profile-image and portfolio operations, and verification requests.
B|/api/collaborations: brand/creator campaign lists, request creation, campaign status transitions and administrator analytics.
B|/api/chat: participant conversations, messages, block state and reports.
B|/api/admin: account search, verification decisions, suspension controls, report review and moderation history.
H|9.2 Security controls implemented
P|Passwords use bcrypt hashing. Protected requests use signed JWT bearer tokens and role checks. Account token versions support invalidation after password reset or suspension. Database updates for profiles, campaigns and conversations are scoped to the authenticated user and role. Campaign and message input is length-checked; chat is rate-limited to 60 sends per user per minute.
P|Password-reset links use random tokens, expire after 15 minutes, are stored hashed and can be used once. Reset requests are rate limited and return a non-enumerating success message when the account does not exist. Profile images have a 5 MB limit; portfolio items have per-media limits and signature checks. Production deployment must additionally enforce HTTPS, secret management, backups, monitoring and security review.
---
TITLE|CHAPTER 10 - USER INTERFACE: PUBLIC AND AUTHENTICATION
H|10.1 Landing and entry
P|The public landing page introduces the platform and provides separate entry points for brand and creator registration. It presents creator highlights and informational sections. The route structure also provides dedicated signup, login and password-reset pages for the supported roles.
H|10.2 Authentication
P|Creator and brand registration collect role-specific information; creator registration includes profile and social-profile details. Login submits credentials and optional remember-me choice. Protected pages require a session whose role matches the route. An expired or invalid session is cleared and the user is directed back to the appropriate sign-in page.
H|10.3 Screenshot placement
S|[SCREENSHOT 01 - Paste a full-width capture of the Brandfluence landing page here. Show the brand/creator entry buttons and navigation.]
S|[SCREENSHOT 02 - Paste a capture of either the creator or brand signup/login page. Do not include a real password or personal email.]
P|Figure captions: Figure 1. Public landing page. Figure 2. Role-specific account entry. Use a readable browser zoom and crop browser tabs or unrelated desktop content.
---
TITLE|CHAPTER 11 - CREATOR WORKSPACE
H|11.1 Creator dashboard
P|The creator dashboard presents campaign requests with brand name, campaign brief, deliverables, budget, due date and current state. A pending request can be accepted or declined. When work is in progress, the creator provides a short submission note. Status history makes prior transitions visible.
H|11.2 Profile and portfolio
P|The profile editor supports display name, biography, city, category, rate, follower count and Instagram profile URL. Creators can upload and replace a profile image, add up to 12 images or videos, edit captions, reorder items and remove portfolio entries. The public creator profile presents the approved public fields and selected work to brands.
H|11.3 Verification
P|A creator can submit public-profile evidence or context for administrator review. The platform explicitly does not request government identity documents. The administrator records a decision reason. Verification is presented as a platform review label, not a guarantee of audience size or engagement.
S|[SCREENSHOT 03 - Paste a creator dashboard capture showing a sample campaign card, its status and the available next action.]
S|[SCREENSHOT 04 - Paste a creator profile/portfolio capture showing profile fields, verification status and example portfolio items.]
---
TITLE|CHAPTER 12 - BRAND AND CAMPAIGN WORKSPACE
H|12.1 Creator discovery
P|The brand dashboard lists creator cards and supports category selection, partial city search, maximum rate and minimum follower filters. A brand can open a creator profile to review the biography, location, rate, verification label and portfolio before initiating a campaign.
H|12.2 Campaign request
P|The request form requires a title, campaign brief, deliverables, positive budget and a due date that is today or later. The server validates each field, checks that the selected account is an active creator and stores the brand and creator references with a pending status.
H|12.3 Lifecycle
P|The supported path is Pending to Accepted or Rejected by the creator; Accepted to In Progress by the brand; In Progress to Submitted by the creator with a note; and Submitted to Completed by the brand. Each transition is restricted by role, ownership and expected prior state. The dashboard displays status history and the next available action.
S|[SCREENSHOT 05 - Paste a brand dashboard capture showing creator cards and one or more active filters.]
S|[SCREENSHOT 06 - Paste a campaign request form or campaign card showing title, brief/deliverables, budget, due date and status.]
---
TITLE|CHAPTER 13 - CAMPAIGN CHAT AND ADMINISTRATION
H|13.1 Campaign chat
P|Campaign participants can open a conversation associated with their collaboration. The inbox shows partner, campaign title, latest message and unread count. Messages are limited to 2,000 characters, and the API returns the latest 100 when loading a conversation. Opening a conversation marks that user's unread messages as read.
P|Either participant may block the chat. A block prevents new messages from both sides while preserving read-only history. Participants may submit a reasoned report for review. The client refreshes conversations and active messages periodically; chat is HTTP polling, not a WebSocket push service.
H|13.2 Administration
P|The admin workspace includes verification requests, account search and suspension/reactivation, open chat reports, a moderation activity log and a completed-campaign creator leaderboard. Decisions require reasons and are recorded as moderation actions. Suspended accounts cannot use protected APIs and must sign in again after reactivation.
S|[SCREENSHOT 07 - Paste a campaign chat capture showing the conversation list and a sample conversation. Hide real names and message contents if necessary.]
S|[SCREENSHOT 08 - Paste an admin dashboard capture showing verification, reports or moderation activity. Do not show credentials or sensitive account data.]
---
TITLE|CHAPTER 14 - TESTING STRATEGY
H|14.1 Testing levels
P|Testing combines server route tests with client utility tests. Server tests exercise authentication, role boundaries, validation, campaign transitions, password reset, chat, upload signatures, creator search and moderation behavior. Client tests cover session storage and media URL handling. A browser walkthrough should additionally confirm the complete role-based workflow in the running application.
H|14.2 Key test scenarios
B|Authentication: missing token, invalid role, suspended user, expired/reset session and successful role-specific access.
B|Campaigns: reject incomplete requests, enforce valid due date and budget, allow only the next transition by the owning participant, reject stale transitions.
B|Chat: enforce conversation membership, message length/rate limit, unread marking, block behavior and report ownership.
B|Profiles/admin: validate creator filters and uploads, prevent cross-account edits, require moderation reasons and restrict admin routes.
H|14.3 Acceptance criteria
P|A scenario passes when the server returns the expected success or error status, the stored state reflects only the authorized update, and the client presents a clear resulting state. Test data should use dedicated demo accounts and be removed or anonymized before screenshots.
---
TITLE|CHAPTER 15 - TEST EXECUTION AND RESULTS
H|15.1 Automated results
P|Backend: the server test command completed successfully with 38 tests passed, zero failed and zero skipped. Coverage exercised authentication, password reset, campaign transitions, chat boundaries, upload signature validation, profile filtering and administrator moderation.
P|Frontend: the client test command completed with the auth-session and media-URL utility suites passing (5 tests). The App test suite could not start because react-router-dom was unavailable in the installed client node_modules, although it is declared in the client dependency manifest. Restore the client dependencies and rerun the suite before final submission.
H|15.2 Result summary
B|Role-aware access and protected route behavior are covered by server tests.
B|Campaign state changes are checked against participant ownership and current status.
B|Chat blocks, message access and moderation workflows have focused automated coverage.
B|A full manual demonstration with populated accounts and screenshots remains a final submission activity.
H|15.3 Limitations of testing
P|Automated tests do not establish production performance, accessibility compliance, email deliverability, deployment hardening or real-world creator metric accuracy. The missing client package must be restored locally and the App suite rerun to complete client validation.
---
TITLE|CHAPTER 16 - CONCLUSION AND FUTURE ENHANCEMENTS
H|16.1 Conclusion
P|Brandfluence implements a focused creator-brand collaboration workflow using a React client, Express API and MongoDB data models. Brands can discover creators and issue structured requests; creators can manage profiles and portfolios and progress assigned work; both parties can communicate through campaign-linked chat. Administrator review tools provide verification, account and report moderation with recorded reasons.
P|Server-side role checks, participant ownership constraints, expected-state transitions, password-reset controls and upload validation support the integrity of the prototype. The backend test suite passed in this environment. The client utility tests passed, but the client App test needs a dependency restore before it can be considered complete.
H|16.2 Future enhancements
B|Add WebSocket or server-sent-event messaging with delivery acknowledgements and stronger concurrency controls.
B|Add campaign analytics, verified performance reporting and exportable summaries with transparent data provenance.
B|Add notification preferences, reminders, accessibility testing and broader responsive-device validation.
B|Introduce production-grade object storage, malware scanning, backup/retention policies and deployment monitoring.
B|Add payment milestones only after legal, dispute-resolution and payment-provider requirements are defined.
P|These items are recommendations and are not represented as current capabilities.
---
TITLE|REFERENCES AND SCREENSHOT CHECKLIST
H|References
B|React documentation, https://react.dev/ (accessed November 2026).
B|Node.js documentation, https://nodejs.org/docs/ (accessed November 2026).
B|Express documentation, https://expressjs.com/ (accessed November 2026).
B|MongoDB documentation, https://www.mongodb.com/docs/ (accessed November 2026).
B|Mongoose documentation, https://mongoosejs.com/docs/ (accessed November 2026).
B|Project implementation and tests: Brandfluence client and server source code, supplied with this project.
H|Screenshot insertion checklist
B|Page 17: Screenshot 01 landing page; Screenshot 02 signup or login screen.
B|Page 18: Screenshot 03 creator dashboard; Screenshot 04 creator profile/portfolio.
B|Page 19: Screenshot 05 brand creator search; Screenshot 06 campaign request/list.
B|Page 20: Screenshot 07 campaign chat; Screenshot 08 administrator workspace.
P|Paste each image over its matching yellow [SCREENSHOT] placeholder, keep the caption beneath it, and resize proportionally so page text remains readable. Use fictional/demo account data and hide email addresses, tokens, passwords and private conversations.
H|Local demonstration reminder
P|Start the API and client using the project README instructions and configure the database and signing key in local environment settings. Configure SMTP only if demonstrating password reset. Never include secret values in screenshots or this report.
'@

$pages = @()
foreach ($block in ($reportContent -split '(?m)^---\s*$')) {
  $items = @($block.Trim() -split "`r?`n")
  if ($items.Count -eq 0 -or -not $items[0].StartsWith('TITLE|')) { continue }
  $page = @{ title = $items[0].Substring(6); lines = @() }
  foreach ($item in $items | Select-Object -Skip 1) {
    if ($item -match '^[PHBS]\|') { $page.lines += $item }
  }
  $pages += $page
}

$app = New-Object -ComObject Word.Application
$app.Visible = $false
$app.DisplayAlerts = 0
try {
  $doc = $app.Documents.Open($inputPath, $false, $false, $false)
  $doc.SaveAs2($outputPath, 12)

  $replacements = @(
    @('SANJEEVANI - CONNECTING FARMERS TO ', 'BRANDFLUENCE: CONNECTING BRANDS AND CREATORS'),
    @('TRUSTED WAREHOUSES', 'FOR IMPACTFUL COLLABORATIONS'),
    @('SALIYA VIVEK DHARMESHBHAI', 'DHRUV OZARKAR'),
    @('255160694034', '255160694025'),
    @('SANJEEVANI – CONNECTING FARMERS TO TRUSTED WAREHOUSES', 'BRANDFLUENCE: CREATOR-BRAND COLLABORATION PLATFORM'),
    @('SANJEEVANI - CONNECTING FARMERS TO TRUSTED WAREHOUSES', 'BRANDFLUENCE: CREATOR-BRAND COLLABORATION PLATFORM'),
    @('Prof. A. C. Patel', 'Prof. Ankit Patel')
  )
  foreach ($pair in $replacements) {
    $find = $doc.Content.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    $find.Text = $pair[0]
    $find.Replacement.Text = $pair[1]
    $find.Forward = $true
    $find.Wrap = 1
    $find.Format = $false
    $find.MatchCase = $false
    $find.MatchWholeWord = $false
    [void]$find.Execute($null, $null, $null, $null, $null, $null, $null, $null, $null, $pair[1], 2)
  }

  $certificate = 'This is to certify that the project report entitled BRANDFLUENCE: CREATOR-BRAND COLLABORATION PLATFORM has been carried out by Dhruv Ozarkar (255160694025) under the guidance of Prof. Ankit Patel in partial fulfillment of the requirements for the Master of Computer Applications degree, Information Technology Department, Semester III, Gujarat Technological University, Ahmedabad, during academic year 2026-27.'
  $declaration = 'I hereby declare that this project report entitled BRANDFLUENCE: CREATOR-BRAND COLLABORATION PLATFORM is a record of original project work carried out by me under the supervision of Prof. Ankit Patel, in partial fulfillment of the requirements for the Master of Computer Applications degree in Information Technology at Gujarat Technological University, Ahmedabad. Sources consulted for this work are acknowledged in the references.'
  foreach ($paragraph in $doc.Paragraphs) {
    $text = $paragraph.Range.Text
    if ($text -like '*This is to certify that the project report submitted along with the project entitled*') {
      $paragraph.Range.Text = $certificate + "`r"
    } elseif ($text -like '*We hereby declare that the project report submitted along with the project entitled*') {
      $paragraph.Range.Text = $declaration + "`r"
    }
  }

  $selection = $app.Selection
  $doc.Range($doc.Content.End - 1, $doc.Content.End - 1).Select()
  $selection.InsertBreak(7)
  $blue = [long]31 + 78 * 256 + 121 * 65536
  $amber = [long]128 + 80 * 256
  for ($index = 0; $index -lt $pages.Count; $index++) {
    $page = $pages[$index]
    $selection.Style = 'Heading 1'
    $selection.Font.Name = 'Times New Roman'
    $selection.Font.Size = 15
    $selection.Font.Bold = $true
    $selection.Font.Color = $blue
    $selection.ParagraphFormat.Alignment = 0
    $selection.ParagraphFormat.SpaceBefore = 0
    $selection.ParagraphFormat.SpaceAfter = 10
    $selection.TypeText($page.title)
    $selection.TypeParagraph()

    foreach ($line in $page.lines) {
      $parts = $line.Split(@('|'), 2)
      $kind = $parts[0]
      $text = $parts[1]
      if ($kind -eq 'H') {
        $selection.Style = 'Heading 2'
        $selection.Font.Name = 'Times New Roman'
        $selection.Font.Size = 12
        $selection.Font.Bold = $true
        $selection.Font.Color = $blue
        $selection.ParagraphFormat.Alignment = 0
        $selection.ParagraphFormat.SpaceBefore = 5
        $selection.ParagraphFormat.SpaceAfter = 3
        $selection.TypeText($text)
        $selection.TypeParagraph()
      } elseif ($kind -eq 'S') {
        $selection.Style = 'Normal'
        $selection.Font.Name = 'Times New Roman'
        $selection.Font.Size = 10
        $selection.Font.Bold = $true
        $selection.Font.Color = $amber
        $selection.Font.HighlightColorIndex = 7
        $selection.ParagraphFormat.Alignment = 1
        $selection.ParagraphFormat.SpaceBefore = 4
        $selection.ParagraphFormat.SpaceAfter = 6
        $selection.TypeText($text)
        $selection.TypeParagraph()
        $selection.Font.Bold = $false
        $selection.Font.HighlightColorIndex = 0
      } else {
        $selection.Style = 'Normal'
        $selection.Font.Name = 'Times New Roman'
        $selection.Font.Size = 10.5
        $selection.Font.Bold = $false
        $selection.Font.Color = 0
        $selection.Font.HighlightColorIndex = 0
        $selection.ParagraphFormat.Alignment = 3
        $selection.ParagraphFormat.LeftIndent = 0
        $selection.ParagraphFormat.FirstLineIndent = 0
        $selection.ParagraphFormat.SpaceBefore = 0
        $selection.ParagraphFormat.SpaceAfter = 5
        if ($kind -eq 'B') {
          $selection.ParagraphFormat.LeftIndent = 18
          $selection.ParagraphFormat.FirstLineIndent = -12
          $text = '- ' + $text
        }
        $selection.TypeText($text)
        $selection.TypeParagraph()
      }
    }
    if ($index -lt $pages.Count - 1) { $selection.InsertBreak(7) }
  }
  $doc.Repaginate()
  $pageCount = $doc.ComputeStatistics(2)
  $doc.Save()
  Write-Output "Saved report: $outputPath"
  Write-Output "Page count: $pageCount"
  Write-Output "Added content pages: $($pages.Count)"
  $doc.Close(0)
} finally {
  $app.Quit()
}
