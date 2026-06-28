from fastapi import FastAPI
from backend.routes import upload, analyze, chat
from fastapi.middleware.cors import CORSMiddleware

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

@app.get('/')
def root():
    return {'status': 'running', 'docs': '/docs'}
