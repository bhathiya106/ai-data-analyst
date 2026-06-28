import openai
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

MODEL = 'llama-3.1-8b-instant'

def get_client():
    return openai.OpenAI(
        api_key=os.getenv('GROQ_API_KEY'),
        base_url='https://api.groq.com/openai/v1'
    )

def build_context(df: pd.DataFrame) -> str:
    numeric = df.select_dtypes(include='number')
    return f"""
Dataset overview:
- Shape: {df.shape[0]} rows, {df.shape[1]} columns
- Columns: {', '.join(df.columns.tolist())}
- Numeric statistics:
{numeric.describe().round(2).to_string() if not numeric.empty else 'None'}
- First 3 rows:
{df.head(3).to_string()}
"""

def ask_question(df: pd.DataFrame, question: str) -> str:
    client = get_client()
    context = build_context(df)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {'role': 'system', 'content': f'You are an expert data analyst. Dataset context: {context}'},
            {'role': 'user', 'content': question}
        ],
        max_tokens=600
    )
    return response.choices[0].message.content

def generate_summary(df: pd.DataFrame) -> str:
    return ask_question(df, '''Generate a concise executive summary covering:
1. Dataset overview
2. Top 3 insights
3. Data quality issues
4. 3 recommendations''')