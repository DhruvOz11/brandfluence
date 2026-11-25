# Brandfluence: 9-Day Viva and MERN Study Guide

This is a focused plan for learning enough JavaScript and MERN to explain this
project honestly, trace its main features, and start rebuilding a smaller
version without AI. Nine days is an intensive start, not a guarantee of
mastery. Aim for 5-7 focused hours per day, with breaks, and write code yourself
before looking at examples.

## How to use this guide

For each day:

1. Read the day's concepts once.
2. Close the guide and explain them aloud in your own words.
3. Do the exercise without copying code.
4. Open the related project files and trace the real implementation.
5. End by answering the viva questions without reading the answers.

Keep a paper glossary of terms you cannot yet explain. For every feature, be
able to describe the user action, frontend code, HTTP request, backend route,
database operation, response, and likely failure.

## The project in one minute

Brandfluence is a React single-page application with an Express API and
MongoDB. It connects brands and creators:

- The React app provides signup/login, dashboards, creator profiles and
  portfolios, collaboration workflows, chat, and admin pages.
- The browser calls the API using Axios. The API base URL is configured in
  `client/src/utils/apiUrl.js`.
- Express mounts authentication, user, collaboration, chat, and admin routes
  under `/api`.
- Mongoose models describe users, collaborations, chat messages, reports, and
  moderation actions.
- Authentication uses password hashing with bcrypt and signed JWTs. Middleware
  verifies tokens and checks roles before protected API operations.
- The app is deployed as two services: the frontend and API. The API also
  needs its environment variables and MongoDB connectivity to be healthy.

Useful source tour:

| What to understand | Start here |
| --- | --- |
| API startup, middleware, route mounting | `server/server.js` |
| React page routing and guarded pages | `client/src/App.js` |
| User fields and validation | `server/models/User.js` |
| Collaboration data and statuses | `server/models/Collaboration.js` |
| Signup, login, reset-password endpoints | `server/routes/authRoutes.js` |
| Token verification and role authorization | `server/middleware/auth.js` |
| Campaign request and status workflow | `server/routes/collaborationRoutes.js` |
| Client requests | `client/src/pages/`, `client/src/utils/` |
| Automated backend checks | `server/test/` |

Never put database credentials, JWT secrets, or mail credentials in frontend
code or in a public repository. Use environment variables on the hosting
provider; do not include secret values in viva slides or screenshots.

## Nine-day plan

### Day 1 — JavaScript foundations

Learn:

- `const` means the binding cannot be reassigned; `let` can be reassigned.
  Prefer `const` unless reassignment is needed.
- Primitive values: string, number, boolean, `null`, `undefined`, and symbol.
  Objects and arrays are reference values.
- Comparisons: use `===` and `!==` to avoid implicit type conversion.
- Conditions: `if/else`, `switch`, ternary `condition ? a : b`.
- Functions: declarations, expressions, arrow functions, parameters, return.
- Arrays and objects: indexing, properties, destructuring, spread syntax.
- Truthiness: empty string, `0`, `false`, `null`, and `undefined` are falsy.

Examples:

```js
const user = { name: 'Asha', role: 'creator' };
const { name, role } = user;
const labels = ['fashion', 'food'];
const withTravel = [...labels, 'travel'];

function canOpenDashboard(currentRole, requiredRole) {
  return currentRole === requiredRole;
}
```

Exercise: implement functions that (1) normalize an email, (2) filter an array
of creators by category, and (3) total a list of collaboration charges. Test
empty arrays, missing values, and wrong types.

Viva practice: What is the difference between `==` and `===`? When would a
function return `undefined`? What does `const` protect, and what does it not
protect?

### Day 2 — JavaScript used in web apps

Learn:

- Array methods: `map` transforms, `filter` selects, `find` returns one match,
  `some`/`every` test conditions, and `reduce` accumulates a result.
- Scope: a variable declared inside a function/block is not generally
  available outside it.
- Closures: an inner function can access variables from the outer function.
  React event handlers and hooks rely on this idea.
- Errors: `try/catch` handles thrown errors; validate external input instead
  of assuming it is correct.
- Modules: `import`/`export` in React; `require`/`module.exports` in this
  CommonJS Node backend.
- JSON represents data for transport; it cannot represent functions or
  `undefined`.

```js
const activeCreators = creators.filter(creator => creator.isVerified);
const names = activeCreators.map(creator => creator.name);
const totalCharges = deals.reduce((sum, deal) => sum + deal.charges, 0);
```

Exercise: given sample users and deals, produce a list of verified creator
names and total completed-deal revenue. Explain the input and output types.

Viva practice: What does `map` return? How is it different from `forEach`?
What is an exception? Why is validating request input still necessary if the
frontend has `required` fields?

### Day 3 — Async JavaScript, HTTP, and APIs

Learn:

- JavaScript runs synchronous code on the call stack. Network and file
  operations take time, so Node uses asynchronous APIs.
- A Promise represents a result that may be available later: pending,
  fulfilled, or rejected.
- `async` functions always return a Promise. `await` pauses that function
  until the Promise settles; it does not freeze the whole server.
- Use `try/catch` around awaited operations that can fail.
- HTTP request essentials: URL, method, headers, optional body. Responses have
  status, headers, and body.
- Common methods: GET reads, POST creates/actions, PUT replaces/updates,
  PATCH partially updates, DELETE removes.
- Status examples: 200 success, 201 created, 400 invalid input, 401
  unauthenticated, 403 forbidden, 404 missing, 500 server error.
- CORS is a browser-enforced permission mechanism based on response headers.
  A preflight is an `OPTIONS` request sent before some cross-origin requests.
  A CORS message can also mask a service/network failure; inspect the actual
  response and server logs.

```js
async function loadProfile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Profile request failed:', error);
    throw error;
  }
}
```

Exercise: write a tiny Node script that makes a request to a public test API,
parses JSON, and handles a failed request. Explain why a request is not
automatically successful just because `await` completed.

Viva practice: What does `await` do? What is the difference between a 401 and
403? Why might a browser send `OPTIONS` before `POST`?

### Day 4 — React and the frontend

Learn:

- A component is a function that returns UI. JSX is syntax transformed into
  JavaScript calls; it is not HTML parsed directly by the browser.
- Props pass data into a component. State stores data that changes over time.
- `useState` gives a state value and setter; call the setter rather than
  mutating state directly.
- Event handlers respond to actions such as form submission. Call
  `event.preventDefault()` to stop a browser form's default navigation.
- Controlled inputs take their value from state and update through
  `onChange`.
- Conditional rendering shows different UI for loading, error, empty, and
  success states.
- `useEffect` synchronizes with external systems; specify dependencies
  carefully and clean up subscriptions/timers when needed.
- React Router maps paths to page components. A frontend route guard improves
  navigation UX, but it does not replace backend authorization.

Exercise: build a small React page with a controlled search input, a list of
sample creators, and a loading/error/empty state. Do not fetch anything yet.

Viva practice: Why should state not be mutated directly? What causes a
component to render again? Is hiding a dashboard route enough to protect its
data?

### Day 5 — Node.js, Express, and REST structure

Learn:

- Node.js runs JavaScript outside the browser and provides server APIs.
- Express handles requests through middleware and routes.
- Middleware runs in order. It may read/modify the request, send a response,
  or call `next()`.
- `express.json()` parses JSON request bodies. File uploads need multipart
  parsing middleware such as Multer.
- A route combines method and path, for example `router.post('/request', ...)`.
- Validate every client-controlled field on the server. Return a suitable
  status and clear error response.
- Keep secrets in environment variables; never commit `.env`.
- `npm start` starts this API. The frontend and backend have separate
  package files and commands.

```js
router.post('/example', async (req, res) => {
  const { title } = req.body;
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    return res.status(201).json({ title: title.trim() });
  } catch (error) {
    console.error('Create failed:', error);
    return res.status(500).json({ error: 'Unable to create item' });
  }
});
```

Exercise: create a local Express route that validates a title and returns a
JSON response. Test valid and invalid requests using a REST client or `curl`.

Viva practice: What is middleware? Why is its order important? Why does
server-side validation matter? What does `res.status(201).json(...)` do?

### Day 6 — MongoDB, Mongoose, and data modeling

Learn:

- MongoDB stores BSON documents in collections; it is not a relational
  database, though related documents can reference each other.
- A Mongoose schema describes document fields, types, defaults, required
  fields, enums, and constraints. A model provides methods to query and save.
- `_id` is a document identifier. References can point to another model;
  `.populate()` loads selected referenced fields.
- Choose embedding for closely related bounded data and references for
  separately managed entities/relationships.
- Database validation complements (does not replace) API validation.
- Unique indexes/constraints matter for duplicate-sensitive fields like email.
- Database operations are asynchronous and can fail due to connectivity,
  credentials, validation, or duplicate data.

In this app, a User stores a role and creator profile fields. A Collaboration
references `brandId` and `creatorId`, and stores a status plus status history.
That makes it possible to query campaigns for one participant and enforce
ownership.

Exercise: sketch a schema for a bookable project with customer, provider,
budget, due date, and status history. Explain which fields are references and
which are stored on the project.

Viva practice: What is a schema vs a model? What does `populate` do? Why do
both `required: true` and route validation exist?

### Day 7 — Authentication, authorization, security, and files

Learn:

- Authentication asks “who are you?” Authorization asks “may you do this?”
- Hash passwords with bcrypt; never store plaintext passwords. Hashing is
  one-way and different from encryption.
- After successful login, a server can sign a JWT. The client sends it as a
  bearer token; backend middleware verifies signature/expiry and loads the
  associated user.
- A valid token alone is not permission: check role, ownership, suspension,
  and whether the requested state transition is allowed.
- Never trust a user ID, role, amount, file path, or status supplied by the
  browser without checking it server-side.
- `localStorage` and `sessionStorage` are accessible to JavaScript running on
  the page. XSS can expose stored tokens; storage choices have tradeoffs.
- Upload handling should restrict size/type, validate content, use safe names,
  and store files durably. A server's temporary filesystem may not persist
  across redeploys.
- Rate limits can reduce abuse of sensitive routes such as password reset.

Exercise: draw a login sequence: password submission → bcrypt comparison →
JWT response → bearer token on protected request → verification middleware →
role/ownership check → response.

Viva practice: What is the difference between hashing and encryption? Can a
frontend route guard secure an API? Why should a backend check that a
collaboration belongs to the logged-in user?

### Day 8 — Trace Brandfluence end-to-end and test it

Trace these flows with the source open:

1. Brand signup: `BrandSignup` → Axios POST → `/api/auth/signup/brand` →
   password hashing → User save → JSON response.
2. Login: form → login endpoint → user lookup/password comparison → JWT →
   client session helper → protected dashboard.
3. Creator search: brand page request → authenticated user route → query and
   filters → JSON results → React renders cards.
4. Campaign request: brand submits details → server validates creator, budget,
   and due date → Collaboration saved as Pending → creator sees it.
5. Status change: authenticated participant requests an allowed transition →
   route checks role, ownership, and current status → history is recorded.
6. Creator signup also attempts Instagram follower lookup; external scraping
   can fail independently of the core API and should not be confused with
   database startup.

Testing concepts:

- Unit tests isolate a function; integration tests exercise connected pieces
  such as a route and its data dependencies.
- Test success and meaningful failures: missing auth, wrong role, invalid
  fields, non-owner, invalid transition, and database failure.
- A passing build verifies compilation, not that production configuration or
  external services are correct.
- For a production issue, compare browser Network details, API response
  status, hosting deployment/runtime logs, and database logs. Do not infer the
  root cause from a CORS message alone.

Exercise: select one flow and write a sequence diagram on paper. Then explain
each file involved without reading line-by-line.

Viva practice: Walk through signup. What happens if MongoDB is unavailable?
What is tested by a successful frontend build? What can cause CORS-like
browser errors?

### Day 9 — Rebuild a small version and rehearse

Build a mini app without AI, using notes only after trying:

1. Create a React form to add a creator name and category.
2. Create Express `GET /api/creators` and `POST /api/creators`.
3. Store and list the creators in MongoDB using Mongoose.
4. Add validation and clear error responses.
5. Add a login route and a protected route; explain the security boundaries.
6. Add one automated test for successful creation and one invalid request.

Do not attempt the full production app in a day. The goal is to demonstrate
that you can recreate the core request/data flow and independently debug it.

Finish by delivering a 3-minute explanation of the app, a 5-minute
architecture walkthrough, and answers to the viva bank below. Record yourself
once and note where you are guessing.

## MERN and JavaScript quick reference

### Data and syntax

```js
const profile = { name: 'Ravi', category: 'tech' };
const updated = { ...profile, category: 'fitness' }; // new object
const isValid = typeof profile.name === 'string' && profile.name.length > 0;
```

- `===`: strict equality; `&&`: both conditions; `||`: either condition;
  `!`: negation.
- `array.map(fn)`: new array of transformed values.
- `array.filter(fn)`: new array of matching values.
- `array.find(fn)`: first matching value or `undefined`.
- `array.reduce(fn, initialValue)`: accumulated result.
- Optional chaining `value?.property` stops safely if value is nullish.
- Nullish coalescing `value ?? fallback` uses fallback only for `null` or
  `undefined` (unlike `||`, which also treats `0` and `''` as missing).
- Use descriptive names and small functions. Avoid deeply nested conditions.

### React

```jsx
function Greeting({ name }) {
  const [open, setOpen] = React.useState(false);

  return (
    <section>
      <p>Hello, {name}</p>
      <button onClick={() => setOpen(value => !value)}>Toggle</button>
      {open && <p>Details are open.</p>}
    </section>
  );
}
```

State belongs to React; when it changes through its setter, React renders
again. Props are read-only inputs from a parent. Keep data flow explicit.

### Express request flow

```text
Browser → URL/method/headers/body → CORS and parsing middleware
        → route → validation/authentication/authorization
        → model/database → status + JSON response → UI state
```

`req.params` comes from path segments, `req.query` from the URL query string,
and `req.body` from parsed request content. Never log passwords, tokens, or
connection strings.

### MongoDB

```js
const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Pending', 'Done'], default: 'Pending' }
});
```

The schema describes stored documents; the model performs database work.
Mongoose calls such as `find`, `findById`, and `save` return asynchronous
results that should be awaited and handled.

### Debugging checklist

1. Reproduce once and note the exact action and time.
2. Inspect the browser Network request: URL, method, status, request body,
   response body, and preflight if present.
3. Check frontend console for the actual error, not only the first message.
4. Check backend runtime logs and deployment status.
5. Confirm the API is reachable before diagnosing CORS.
6. Check env variable names and service configuration without printing
   secret values.
7. Change one thing at a time; retest the same request.

## Viva question bank with answer prompts

Practice answering in your own words; these are prompts, not scripts to
memorize.

1. **What is MERN?** MongoDB for persistence, Express for API routing,
   React for UI, Node.js as the JavaScript runtime.
2. **Why use React?** Component-based UI, state-driven rendering, and reusable
   page pieces; explain the actual components in this app.
3. **What does Express do?** Receives HTTP requests, runs middleware and route
   handlers, and sends responses.
4. **What does Mongoose add?** Models and schema-based validation/query
   helpers over MongoDB's driver.
5. **How is a password stored?** A bcrypt hash is persisted; login compares a
   submitted password against the hash. Never reveal an actual password.
6. **How does a protected API request work?** Client sends a bearer token;
   middleware verifies it, loads the user, checks suspension/role, then
   continues.
7. **What is role-based access control?** Restricting operations based on
   roles such as brand, creator, and admin; ownership checks are also needed.
8. **How does campaign status work?** A collaboration has an enumerated
   status; routes allow only specific role/status transitions and record
   history.
9. **Why is the server the source of truth?** Browser code can be changed or
   bypassed; sensitive validation and permissions must be enforced by the API.
10. **What is CORS?** A browser rule using server response headers to decide
    whether a page from one origin may read a response from another.
11. **What is a preflight?** A browser-generated `OPTIONS` check for certain
    cross-origin requests, before the actual request.
12. **What is a 502?** A gateway/proxy could not get a valid response from its
    upstream service; it is not itself proof of a CORS configuration error.
13. **What happens when MongoDB is down?** Database-backed operations fail;
    startup/connectivity and route error handling should be checked in logs.
14. **Why use environment variables?** Different environments need different
    configuration and secrets must not be embedded in source code.
15. **What is a Promise?** An object representing an asynchronous result that
    may fulfill or reject; `async/await` provides readable syntax around it.
16. **How do you prevent duplicate email?** Validate in the API and enforce a
    unique database index/constraint, then handle duplicate-key errors.
17. **What does a Mongoose reference do?** Stores another document's ID;
    population can fetch selected related fields.
18. **How do you test an endpoint?** Test expected status/body for valid input
    and representative invalid, unauthenticated, unauthorized, and failure
    cases.
19. **What are limitations of local file uploads on a host?** Files may be
    ephemeral or lost on redeploy; durable object/file storage is needed.
20. **What would you improve next?** Pick one defensible improvement—such as
    stronger validation, better upload storage, observability, or test
    coverage—and explain tradeoffs rather than claiming the app is perfect.

## Honest viva response pattern

When asked about a feature:

1. State its purpose.
2. Trace the frontend component and user action.
3. Name the HTTP method/path and relevant request data.
4. Explain middleware, validation, model/database operation, and response.
5. Mention a failure case and how it is handled.

If you do not know a detail, say what you verified, distinguish it from what
you are unsure of, and explain how you would investigate. Do not claim that
you personally authored generated code you cannot explain. Understanding and
clearly describing your current implementation is a stronger viva answer than
memorized jargon.
