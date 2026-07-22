from dotenv import load_dotenv
import os

# Load workspace environment variables from .env file FIRST
load_dotenv()

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.routes import upload, analyze, chat, auth
from backend.database import init_db
from fastapi.middleware.cors import CORSMiddleware

# Initialize database
init_db()

app = FastAPI(title='AI Data Analyst', version='1.0')

# CORS allows the Streamlit frontend (different port) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

# Register all route files
app.include_router(upload.router, prefix='/api')
app.include_router(analyze.router, prefix='/api')
app.include_router(chat.router, prefix='/api')
app.include_router(auth.router, prefix='/api')

# Setup static files directory
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
os.makedirs(STATIC_DIR, exist_ok=True)

# Setup outputs directory
OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'outputs')
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Mount static files (for css, js, etc.)
app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')
app.mount('/outputs', StaticFiles(directory=OUTPUTS_DIR), name='outputs')

@app.get('/')
def root():
    index_path = os.path.join(STATIC_DIR, 'index.html')
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {'status': 'running', 'docs': '/docs', 'message': 'Please create static/index.html'}


