from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import sqlite3
import os
import shutil
import requests
import urllib.parse
from backend.database import get_db, hash_password, verify_password

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# Default local redirect URI, override via GOOGLE_REDIRECT_URI env var if deployed
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

router = APIRouter(prefix="/auth")

class UserAuthRequest(BaseModel):
    username: str
    password: str

# Helper to verify if request is from an admin
def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("token-"):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    try:
        parts = authorization.split("-")
        user_id = int(parts[1])
        conn = get_db()
        user = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.close()
        if not user or user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Access denied. Admin role required.")
        return True
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication verification failed")

@router.post("/register")
def register(request: UserAuthRequest):
    username = request.username.strip()
    password = request.password
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password cannot be empty")
        
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check if username exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username is already taken")
            
        # Hash password and insert
        pw_hash = hash_password(password)
        cursor.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (username, pw_hash, 'user')
        )
        conn.commit()
        return {"message": "User registered successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username is already taken")
    finally:
        conn.close()

@router.post("/login")
def login(request: UserAuthRequest):
    username = request.username.strip()
    password = request.password
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        # Generate simple secure token: token-[id]-[some_hash]
        import secrets
        token_suffix = secrets.token_hex(8)
        token = f"token-{user['id']}-{token_suffix}"
        
        return {
            "token": token,
            "username": user["username"],
            "role": user["role"]
        }
    finally:
        conn.close()

# Admin routes
@router.get("/admin/users", dependencies=[Depends(verify_admin)])
def get_users():
    conn = get_db()
    try:
        users = conn.execute("SELECT id, username, role FROM users").fetchall()
        return [{"id": u["id"], "username": u["username"], "role": u["role"]} for u in users]
    finally:
        conn.close()

@router.post("/admin/cleanup", dependencies=[Depends(verify_admin)])
def cleanup_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    uploads_dir = os.path.join(base_dir, 'uploads')
    outputs_dir = os.path.join(base_dir, 'outputs')
    
    cleaned_dirs = []
    
    for folder in [uploads_dir, outputs_dir]:
        if os.path.exists(folder):
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        # Avoid deleting gitignores or system logs
                        if filename not in ['.gitignore', '.gitkeep']:
                            os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f"Failed to delete {file_path}. Reason: {e}")
            cleaned_dirs.append(os.path.basename(folder))
            
    return {"message": f"Successfully cleaned directories: {', '.join(cleaned_dirs)}"}

@router.get("/google/login")
def google_login():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file."
        )
    
    # Generate Google OAuth authorization URL
    params = {
        "response_type": "code",
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account consent" # Forces account chooser screen to list logged-in accounts on device
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url=auth_url)

@router.get("/google/callback")
def google_callback(code: str = None, error: str = None):
    if error:
        # Redirect back to homepage with error query parameter
        return RedirectResponse(url=f"/?error={urllib.parse.quote(error)}")
        
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # 1. Exchange authorization code for token
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    try:
        token_resp = requests.post(token_url, data=data)
        token_data = token_resp.json()
        
        if token_resp.status_code != 200:
            err_msg = token_data.get("error_description", "Failed to retrieve access token")
            return RedirectResponse(url=f"/?error={urllib.parse.quote(err_msg)}")
            
        access_token = token_data.get("access_token")
        
        # 2. Fetch user profile info
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        user_resp = requests.get(userinfo_url, headers=headers)
        user_data = user_resp.json()
        
        if user_resp.status_code != 200:
            return RedirectResponse(url=f"/?error=Failed+to+fetch+user+profile")
            
        email = user_data.get("email")
        name = user_data.get("name", email.split('@')[0])
        
        if not email:
            return RedirectResponse(url=f"/?error=Email+not+provided+by+Google")

        # 3. Check database for user
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, username, role FROM users WHERE username = ?", (email,))
        user = cursor.fetchone()
        
        if not user:
            # Create a new user account dynamically with role 'user'
            # For Google accounts, store a placeholder hash that can never be guessed
            import secrets
            placeholder_hash = hash_password(secrets.token_hex(32))
            cursor.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                (email, placeholder_hash, 'user')
            )
            conn.commit()
            cursor.execute("SELECT id, username, role FROM users WHERE username = ?", (email,))
            user = cursor.fetchone()
            
        user_id = user["id"]
        username = name or user["username"]
        role = user["role"]
        conn.close()
        
        # 4. Generate secure token
        import secrets
        token_suffix = secrets.token_hex(8)
        session_token = f"token-{user_id}-{token_suffix}"
        
        # 5. Redirect browser back to frontend homepage with authentication query string
        redirect_params = {
            "token": session_token,
            "username": username,
            "role": role
        }
        redirect_url = "/?" + urllib.parse.urlencode(redirect_params)
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        return RedirectResponse(url=f"/?error={urllib.parse.quote(str(e))}")
