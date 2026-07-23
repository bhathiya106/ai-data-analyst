from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from backend.services.ai_assistant import ask_question, generate_summary
import os

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    file_path: str = 'uploads/cleaned_data.csv'

@router.post('/chat')
def chat(request: ChatRequest):
    file_path = request.file_path
    if not os.path.isabs(file_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, file_path)
        
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No active dataset found.")
        
    df = pd.read_csv(file_path)
    answer = ask_question(df, request.question)
    return {'answer': answer}

@router.get('/summary')
def summary(file_path: str = 'uploads/cleaned_data.csv'):
    if not os.path.isabs(file_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, file_path)
        
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No active dataset found.")
        
    df = pd.read_csv(file_path)
    return {'summary': generate_summary(df)}
