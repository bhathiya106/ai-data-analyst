from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd
from backend.services.ai_assistant import ask_question, generate_summary

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    file_path: str = 'uploads/cleaned_data.csv'

@router.post('/chat')
def chat(request: ChatRequest):
    df = pd.read_csv(request.file_path)
    answer = ask_question(df, request.question)
    return {'answer': answer}

@router.get('/summary')
def summary(file_path: str = 'uploads/cleaned_data.csv'):
    df = pd.read_csv(file_path)
    return {'summary': generate_summary(df)}
