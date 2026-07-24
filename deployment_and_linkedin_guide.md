# Deployment & LinkedIn Showcase Guide

This guide details how to deploy the **AI Data Analyst** system to cloud platforms (specifically Railway), configure variables, and prepare for your LinkedIn showcase.

---

## 🚀 Part 1: How to Deploy the Project to Railway (Live Server)

Follow these step-by-step instructions to deploy your application to the Railway Cloud Platform.

### Step 1: Initialize Git and Ignore Secrets Locally
Because the `.env` file contains private API keys and OAuth secrets, it must never be uploaded to GitHub.
1. Make sure your `.gitignore` contains the following lines (already configured in the project):
   ```text
   .env
   __pycache__/
   venv/
   *.db
   uploads/*
   !uploads/.gitkeep
   outputs/*
   !outputs/.gitkeep
   ```
2. If `.env` was previously committed to Git, remove it from tracking:
   ```bash
   git rm --cached .env
   git commit -m "Security: Remove .env from git tracking"
   git push origin main
   ```

### Step 2: Push Your Codebase to GitHub
Ensure all files are staged, committed, and pushed:
```bash
git add .
git commit -m "Deployment preparation: absolute paths and IPv4 overrides"
git push origin main
```

### Step 3: Set Up and Configure on Railway
1. Sign up/Log in at [railway.app](https://railway.app/).
2. Create a new project and select **"Deploy from GitHub repo"**.
3. Choose your `ai-data-analyst` repository.
4. Go to the **Variables** tab of the service on the Railway Dashboard and configure the following environment variables:
   - `GROQ_API_KEY`: Your Groq API key (e.g. `gsk_...`). Ensure there are no trailing newlines or spaces at the end of the key!
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
   - `GOOGLE_REDIRECT_URI`: Set to `https://your-railway-app-domain.up.railway.app/api/auth/google/callback`
5. Go to the **Settings** tab:
   - Under **Source**, click **Enable** next to **"Auto deploy is disabled"** to trigger automatic redeployment every time you run a `git push`.
   - If Railway has not updated to the latest commit, click **"Check for updates"** and click **"Update"** to pull the latest changes.
   - In the **Networking** section, ensure your target port is set to **`8080`** (which matches Uvicorn's configuration).

---

## 🔐 Part 2: Multi-Agent AI System Architecture (For IT 3041 Report & Viva)

Your project is structured as a **collaborative multi-agent system** meeting all requirements of the IT 3041 brief:

```
[ Frontend: User Interface (app.js) ]
               │
               │ HTTP API Handshakes (REST / JSON)
               ▼
┌────────────────────────────────────────────────────────┐
│               FastAPI Async Backend                    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Agent A: Data Prep & Feature Engineering Agent   │  │
│  │ - Cleans datasets (duplicates, median/mode nulls)│  │
│  │ - Outputs: cleaned_data.csv                      │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│                           │ Data Flow Integration      │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Agent B: Business Intelligence & Forecasting Agent│  │
│  │ - Performs regression forecasting (Scikit-Learn) │  │
│  │ - Exports dynamic Plotly HTML charts to disk      │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│                           │ Context Injection          │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Agent C: Executive AI Analyst & Reporting Agent  │  │
│  │ - Queries dataset statistics & metadata (DoH/RAG)│  │
│  │ - Generates reports (Groq / Llama 3.1 8B API)    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Agent A (Data Prep)**: Cleans data structures using Pandas and NumPy.
2. **Agent B (Visualizer & Forecaster)**: Automatically builds Plotly interactive dashboards and trains linear regression models.
3. **Agent C (Executive AI Assistant)**: Uses Llama 3.1 via Groq API to answer queries in real-time. It communicates with the data layer via a custom RAG (Retrieval-Augmented Generation) schema context.

---

## 💼 Part 3: LinkedIn Project Showcase Post Template

Copy and paste this post to your LinkedIn profile to highlight your technical capabilities to hiring managers and recruiters!

```text
Project Update: Building an AI-Powered Data Analyst Platform

I am pleased to share my latest project, a fully functional, cloud-deployed AI Data Analyst Platform designed to turn raw datasets into interactive visualizations and predictive insights in seconds.

Manual data cleaning, complex charting, and report writing can take hours of manual effort. I built this seamless, end-to-end tool to allow users to upload a dataset, automatically clean it, generate interactive plots, and ask a conversational AI assistant questions about their business metrics.

Here is a breakdown of what the application does and the technical stack behind it.

Key Features:
- Google OAuth 2.0 Authentication: Secure login flow with account selection.
- Smart Data Cleaning: Automatic detection and handling of missing values, duplicates, and column data types on upload.
- Interactive Visualizations: Dynamic charts (Bar, Scatter, Line, Heatmaps) powered by Plotly.
- Machine Learning Forecasting: Automated trend forecasting of numeric variables.
- AI Assistant Chat: A natural language assistant that lets you query the dataset and get immediate business insights.
- Executive Summary Generator: Instantly generates detailed executive summaries, data quality reports, and recommendations.
- Export to PDF: Download the professional executive report directly as a beautifully styled PDF document.

The Technology Stack:
Frontend:
- HTML5 and CSS3 (Modern UI, responsive layouts, dark/light palettes)
- Vanilla JavaScript (ES6, asynchronous API integrations)
- Plotly.js (Interactive plotting library)

Backend:
- FastAPI (Python) - High performance, asynchronous web framework.
- Uvicorn - ASGI server implementation.
- SQLite3 - Session and user authentication database.

Artificial Intelligence and Machine Learning:
- Groq Cloud API (Llama 3.1 8B Instant model) for real-time natural language answers and summary reports.
- Pandas and NumPy - High-performance data manipulation and cleaning.
- Scikit-Learn - Used for forecasting and predictive analytics.

Deployment and DevOps:
- Version Control: Git and GitHub.
- Cloud Hosting: Deployed live on the Railway Cloud Platform using containerized Docker environments.

Live Application Link: https://ai-data-analyst-production-ecda.up.railway.app/
(Note: For the best user experience and viewing interactive charts, please use a desktop browser.)

Developing this application provided deep insights into handling production challenges such as CORS, secure Google OAuth redirects, container environment key configuration, and network routing.

I look forward to hearing your thoughts and suggestions in the comments.

#DataScience #MachineLearning #ArtificialIntelligence #FastAPI #Python #WebDevelopment #DataAnalyst #Plotly #GenerativeAI #CloudComputing #Railway #OpenSource
```
