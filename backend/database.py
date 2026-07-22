import sqlite3
import hashlib
import secrets
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'users.db')

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, key_hex = hashed.split(':')
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return key.hex() == key_hex
    except Exception:
        return False

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    """)
    
    # Check if we have an admin
    cursor.execute("SELECT * FROM users WHERE role = 'admin'")
    if not cursor.fetchone():
        # Seed default admin
        admin_hash = hash_password('adminpass')
        cursor.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            ('admin', admin_hash, 'admin')
        )
        print("Database seeded: Default admin created (admin / adminpass)")
        
    # Check if we have a default user
    cursor.execute("SELECT * FROM users WHERE username = 'user'")
    if not cursor.fetchone():
        # Seed default user
        user_hash = hash_password('userpass')
        cursor.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            ('user', user_hash, 'user')
        )
        print("Database seeded: Default user created (user / userpass)")
        
    conn.commit()
    conn.close()
