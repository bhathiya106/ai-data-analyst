# System Architecture & Technical Interview Guide

This guide explains the entire architecture, design patterns, and components of the **AI Data Analyst** system. Use this documentation to prepare for technical discussions or job interviews.

---

## 🏗️ 1. High-Level Architecture Overview

The application follows a decoupled **Client-Server Architecture**:

- **Client**: Vanilla HTML5/CSS3/JS Frontend. Communicates with the backend using JSON REST APIs.
- **Server**: FastAPI Backend. Contains API routing, data science processing, and security layers.
- **Database**: SQLite Database (`users.db` in project root).
- **External AI**: Generative AI LLM client connection for chatbot responses and executive summaries.
- **File Storage**: Server local directories (`uploads/` for datasets and `outputs/` for generated HTML Plotly charts).

### Key Technology Stack:
- **Backend Framework**: **FastAPI** (Python). Chosen for asynchronous speed, automatic Swagger API documentation, and built-in type validation via Pydantic schemas.
- **Database Engine**: **SQLite** (local disk-based database, zero installation required).
- **Core Processing Libraries**: **Pandas** (data structures and cleaning), **Scikit-Learn** (forecasting and analytics), and **Plotly** (interactive HTML data visualization charts).
- **Generative AI Provider**: **Google Gemini / OpenAI API** (via standard client integrations for data summarizing and chat assistants).
- **Frontend Layer**: **Vanilla HTML5, CSS3, and JavaScript**. Zero heavy framework dependencies, utilizing glassmorphism themes and responsive flex layouts.

---

## 🔐 2. Authentication System (Login & Register)

A secure, local session state system blocks access to analytics until a user logs in.

### Technical Details of Auth:
- **Password Security**: Passwords are **never stored as plain text**. We use Python's built-in `hashlib.pbkdf2_hmac` utility with SHA256, applying a dynamic unique string (**salt**) and 100,000 hashing iterations. This makes the database immune to dictionary attacks.
- **Token Authorization**: Upon successful login, the server generates a token (e.g. `token-[user_id]-[hex_suffix]`). The frontend stores this token in browser `localStorage`.
- **API Protection**: Admin-specific endpoints (like listing users or purging directories) require the `Authorization` header. FastAPI checks the token suffix against the database record to verify the user's role before granting access.

---

## 🧹 3. Data Preprocessing & Automated Cleaning Pipeline

When a user uploads a dataset:
1. **File Type Detection**: The file is read via Pandas (`pd.read_csv` or `pd.read_excel`).
2. **Duplicate Purging**: The pipeline searches for identical rows and drops them (`df.drop_duplicates()`).
3. **Null/Missing Value Imputation**:
   - **Numerical columns** (e.g., Sales, Quantity): Empty cells are filled with the column's **median** or **mean** to preserve overall statistical patterns.
   - **Categorical columns** (e.g., Segment, Region): Empty cells are filled with the **mode** (most frequent value) or marked as `"Unknown"`.
4. **Schema Identification**: The pipeline identifies the data types (e.g., `integer`, `float`, `object`, `datetime`) and returns a clean description to the UI.

---

## 📊 4. Interactive Plotly Visualizer

Rather than showing static PNG images, the system provides fully interactive charts.
- **Backend Chart Generation**: When a file is processed, the backend visualizer service creates interactive Plotly objects (correlation heatmaps, trend lines, category distribution charts).
- **Disk Storage**: These charts are exported to disk as standalone HTML files inside `/outputs`.
- **Static Mounting**: FastAPI mounts the `/outputs` folder using `StaticFiles`.
- **Iframe Integration**: The frontend JavaScript calls `/api/analyze` to fetch the paths to these HTML files and dynamically loads them inside standard HTML `<iframe>` objects.

---

## 🤖 5. Generative AI Data Assistant & Reports

### How the AI Chatbot Answers Questions:
1. **Dataset Vectorization / Summarization**: When you ask a question (e.g. *"What is the average sales amount?"*), the backend builds a compact text representation of your data's statistical characteristics (total rows, columns, averages, correlations, missing values list).
2. **Contextual Prompt Injection**: The backend combines your question with this dataset context and a system persona prompt:
   - *Persona*: Expert Business Intelligence Analyst & Consultant.
   - *Rule*: Speak in simple business language, use Markdown lists/tables, and **never output Python code** unless explicitly asked.
3. **Response Handling**: The Gemini LLM parses the statistics and gives a direct, actionable answer, which is parsed from Markdown to HTML on the frontend.
