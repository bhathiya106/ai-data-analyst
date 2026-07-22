# Detailed Project Codebase & File-by-File Guide

This guide breaks down every technology used in the project, details what each code file does, explains the key functions, and demonstrates how the frontend HTML/JS connects to the backend Python FastAPI server.

---

## 🛠️ Part 1: Technology Stack Matrix

Here is the exact mapping of all technologies and libraries used in each subsystem of the application:

| Subsystem | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Backend API Engine** | **FastAPI** | Asynchronous web framework for high-performance Python REST APIs. |
| | **Uvicorn** | ASGI server to run the FastAPI backend. |
| | **Pydantic** | Validates API request data payloads using strict typing schemas. |
| **Database & Security** | **SQLite3** | A local database engine that stores user details in a file (`users.db`). |
| | **Hashlib (PBKDF2)** | Cryptographic security layer to securely hash and verify user passwords. |
| | **Secrets** | Standard Python generator for secure hex tokens. |
| | **Google OAuth 2.0 / Requests** | Secure external OAuth redirects and callbacks to support "Sign In with Google". |
| **Data Processing & ML** | **Pandas** | Reading files, dropping duplicates, executing statistical aggregations, and filling missing values. |
| | **NumPy** | High-performance array structures and numerical operations. |
| | **Scikit-Learn** | Builds regression models to calculate sales forecast trends and R² confidence. |
| | **Plotly** | Generates dynamic, interactive visual HTML charts (scatter, bars, heatmaps). |
| **Artificial Intelligence** | **Google Gemini / OpenAI** | Connects to the Generative AI model to summarize reports and act as a conversational Data Analyst. |
| **Frontend UI Layout** | **HTML5** | Semantic structure divided into layout sections/tabs (Upload, Dashboard, Chat, Report, Admin). |
| | **CSS3 (Vanilla)** | Glassmorphism card visuals, glowing cyan/purple theme variables, grid systems, and flex containers. |
| | **JavaScript (ES6)** | Page state controller, auth token handlers, form submissions, and UI tab managers. |
| | **ChartJS** | Lightweight library to render the frontend Category Bar Chart. |
| | **FontAwesome (v6)** | Responsive vector icon pack for visual sidebars and action buttons. |

---

## 📂 Part 2: File-by-File Explanation of Essential Code

### A. Backend Core Files

#### 1. `backend/main.py`
- **What it does**: The root startup file of the backend. It initializes the database schema, registers API routers, and mounts static file folders.
- **Essential Code**:
  - `init_db()`: Checks if the user table exists and seeds the default user accounts.
  - `app.add_middleware(CORSMiddleware)`: Allows the backend to accept network requests from different frontend hosts/ports.
  - `app.include_router(RouterName)`: Hooks up route modules (`/api/auth`, `/api/upload`, `/api/analyze`, `/api/chat`).
  - `app.mount('/static', StaticFiles...)` and `app.mount('/outputs', StaticFiles...)`: Serves static assets (HTML/CSS/JS) and generated Plotly charts directly to the browser.

#### 2. `backend/database.py`
- **What it does**: Configures the SQLite database and manages password hashing security.
- **Essential Code**:
  - `hash_password(password)`: Generates a random salt, mixes it with the password, and hashes it using `pbkdf2_hmac` with 100,000 iterations. It returns `{salt}:{hashed_key}`.
  - `verify_password(password, hashed)`: Extracts the salt, recalculates the PBKDF2 hash, and checks if it matches the stored hashed key.
  - `init_db()`: Automatically creates the `users` table and inserts default accounts (`admin`/`adminpass` and `user`/`userpass`) if they do not exist.

#### 3. `backend/routes/auth.py`
- **What it does**: Handles registration, login, admin utilities, and Google OAuth social sign-ins.
- **Essential Code**:
  - `/register`: Validates user inputs, checks SQLite for duplicates, hashes the password, and inserts the record with role `'user'`.
  - `/login`: Checks the password. On success, generates a session token format `token-{user_id}-{random_hex}`.
  - `/google/login`: Formulates and redirects the browser window to Google's consent screen.
  - `/google/callback`: Receives authentication code, exchanges it for profile email/name via direct Google API endpoints (token exchange & userinfo), automatically registers new OAuth users, and redirects back to homepage.
  - verify_admin() dependency: Extracts the `user_id` from the token header, checks their database role, and denies access if they are not an administrator.
  - `/admin/users`: Lists registered usernames and roles.
  - `/admin/cleanup`: Deletes uploaded CSV files and generated Plotly charts from disk.

#### 4. `backend/routes/upload.py`
- **What it does**: Receives dataset file uploads, cleans them, and triggers initial analysis.
- **Essential Code**:
  - `/upload` (POST): Accepts file binaries, saves them to `/uploads` directory, calls `clean_dataset()` (from services/eda) to purge duplicates/empty cells, and stores the processed file as the active dataset.

#### 5. `backend/routes/analyze.py`
- **What it does**: Computes metrics and aggregates dynamic charts.
- **Essential Code**:
  - `/analyze` (GET): Loads the cleaned dataset, calls the analytics services (EDA, forecasting, and Plotly visual generator), and returns statistics.
  - `/groupby` (GET): Performs group-by operations dynamically on the dataset (e.g. sum of sales grouped by customer segment) and returns the aggregated values for frontend ChartJS rendering.

#### 6. `backend/routes/chat.py`
- **What it does**: Connects the chat screen to the AI Assistant engine.
- **Essential Code**:
  - `/chat` (POST): Receives a natural language question, passes the active dataset to the AI agent context, and returns the response answer.

---

### B. Backend Service Files (The Brains)

#### 1. `backend/services/eda.py`
- **What it does**: Inspects, describes, and cleans datasets.
- **Essential Code**:
  - `clean_dataset(filepath)`: Uses Pandas to drop duplicates and fill empty cells:
    - Numerical column blanks: Filled with the column median.
    - Categorical column blanks: Filled with the column mode.
  - `generate_eda(filepath)`: Generates stats tables, datatypes (`dtypes`), column lists, and a correlation matrix.

#### 2. `backend/services/ml_engine.py`
- **What it does**: Creates predictive linear models to forecast trends.
- **Essential Code**:
  - `run_sales_forecast(df)`: Dynamically searches for date columns and numerical target columns. It trains a **Scikit-Learn Linear Regression model** using time integers as the input and the target numerical column as output.
  - Returns: Predictability confidence (R² score) and the trend coefficient direction (`upward` or `downward`).

#### 3. `backend/services/visualizer.py`
- **What it does**: Generates interactive HTML charts on the server disk for any uploaded dataset.
- **Essential Code**:
  - `generate_charts(df)`: Dynamically checks columns and types, then runs:
    - **Bar Chart**: Sum of first numerical column grouped by top 10 categories.
    - **Line Chart**: Auto-detects dates to plot numerical metric distributions over time.
    - **Correlation Heatmap**: Tonal representation of numerical correlation matrices.
    - **Pie Chart (Donut)**: Share of categories with percentage layouts (collapses extra items to "Other").
    - **Scatter Plot**: Shows numerical variables relationship distributions.
    - **Histograms**: Metric frequencies for the first 3 numerical features.

#### 4. `backend/services/ai_assistant.py`
- **What it does**: Adapts the Generative AI model into a specialized Business Consultant.
- **Essential Code**:
  - `get_client()`: Validates `GROQ_API_KEY`. If empty, commented out, or set to placeholder, it returns `None` instead of throwing initialization errors.
  - `ask_question()` & `generate_summary()`: Fallback gracefully to helpful user-facing setup notifications and warnings if the AI client is offline.
  - `generate_suggestions()`: Dynamically analyzes dataset categories and falls back to structured list of business-oriented questions immediately if the API key is missing.

---

### C. Frontend Files

#### 1. `backend/static/index.html`
- **What it does**: Holds the visual structural frames, sidebar menus, and interactive grids.
- **Key Slots**:
  - `<div class="login-overlay">`: Screen block dialog that handles authentication inputs.
  - `<section id="tab-upload">`: Drag & drop zones, progress loaders, and data description cards.
  - `<section id="tab-dashboard">`: Displays business summary boxes, aggregation dropdown selections, and the iframe container that displays backend interactive Plotly charts.
  - `<section id="tab-chat">`: Screen where chatbot messages are displayed, along with quick-suggest buttons.
  - `<section id="tab-admin">`: Controls to view registered users and trigger disk purges.

#### 2. `backend/static/app.js`
- **What it does**: The central JavaScript controller of the frontend application.
- **Essential Functions**:
  - `checkUserSession()`: Runs on startup. Intercepts Google OAuth credentials from URL query parameters, parses them, saves to storage, and clears the address bar. If absent, checks `localStorage` to bypass login page if user was already logged in.
  - `checkActiveDataset()`: Evaluates `/api/analyze` on session restore. If a dataset is already active on the backend, it auto-unlocks the dashboard, chat, and reports pages so the user does not have to re-upload files.
  - `switchTab(tabName)`: Activates the requested layout view card and calls appropriate loading functions.
  - `handleFileUpload(file)`: Sends file data via `fetch()`, renders cleaning metrics, and automatically pre-loads dashboard configurations in the background.
  - `updateCategoryChart()`: Triggers a `/groupby` fetch query and feeds the results into a frontend **ChartJS** object. Includes fallback mappings (so if no explicit categorical columns exist, standard fields are substituted to prevent empty card displays).
  - `renderCorrelationHeatmap(correlations)`: Draws the numerical correlation grid and appends an **executive-friendly color legend** explaining positive, neutral, and negative relationships in plain language.
  - `renderSuggestions(suggestions)`: Dynamically renders the generated questions into the suggested questions container in the AI Assistant chat window.
  - `renderPlotlyGallery(charts)`: Creates selection buttons for all Plotly graphs. Clicking a button loads the HTML path into the visual `<iframe>` container.
  - `parseMarkdown(text)`: Translates text formatting (bold, headers, bullet points), and contains a **custom-coded Markdown Table Parser** (`buildHtmlTable`) that converts standard AI table matrices into beautiful glassmorphic responsive HTML tables.

---

## 🔗 Part 3: How Frontend & Backend Connect

Communication between the frontend browser and the FastAPI server happens asynchronously via **fetch APIs**:

```
[ Frontend: JavaScript (app.js) ]
              │
              │  1. Sends HTTP Request (e.g., POST to /api/auth/login)
              │     Include request Headers: Content-Type: application/json
              │     Include request Body: { "username": "admin", "password": "..." }
              ▼
[ Backend: FastAPI Server (main.py -> auth.py) ]
              │
              │  2. Processes request
              │     Validates credentials using SQLite
              │     Generates auth token: "token-1-..."
              ▼
[ Frontend: JavaScript (app.js) ]
              │
              │  3. Receives Response Payload
              │     Saves session token inside localStorage
              │     Unlocks the UI tabs
```

For protected routes (like Admin panels or reports), the frontend sends the security token in the request header:
```javascript
fetch('/api/auth/admin/users', {
    headers: { 'Authorization': state.token } // Passed to authenticate requests
})
```
FastAPI validates this header before executing the query, keeping the system safe and functional.
