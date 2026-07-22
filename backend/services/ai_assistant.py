import openai
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

MODEL = 'llama-3.1-8b-instant'

def get_client():
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key or "your_groq_api_key_here" in api_key:
        return None
    try:
        return openai.OpenAI(
            api_key=api_key,
            base_url='https://api.groq.com/openai/v1'
        )
    except Exception as e:
        print("Error initializing Groq client:", e)
        return None

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
    if not client:
        return ("⚠️ **AI Assistant is currently offline** because the `GROQ_API_KEY` is not configured.\n\n"
                "Please open the **[`.env`](file:///C:/Users/USER/Documents/ai-data-analyst/.env)** file in your project root, "
                "uncomment and set `GROQ_API_KEY=your_actual_key` and restart your Uvicorn server to enable natural language chat!")
        
    context = build_context(df)
    
    system_prompt = f"""You are an expert Business Intelligence Analyst and Data Consultant. 
Your target audience is business executives and managers who are non-technical.

Guidelines:
1. Always translate technical metrics into simple plain-English summaries.
2. Focus on the commercial impact: revenue, growth, segments, or quality.
3. If you present tabular data, format it as a markdown table using standard | column headers.
4. Keep the responses concise and structured in bullet points.
5. If the context does not have the exact numbers to answer the question, state that clearly but try to guide them based on the variables and statistics that are available.

Dataset Context:
{context}
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': question}
            ],
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        print("Error calling Groq API:", e)
        return f"⚠️ **Failed to contact AI Model**: {e}"

def generate_summary(df: pd.DataFrame) -> str:
    client = get_client()
    if not client:
        return ("⚠️ **AI Summary report is currently unavailable** because the `GROQ_API_KEY` is not configured.\n\n"
                "Please open the **[`.env`](file:///C:/Users/USER/Documents/ai-data-analyst/.env)** file in your project root, "
                "uncomment and set `GROQ_API_KEY=your_actual_key` and restart your Uvicorn server to generate automatic summaries!")
                
    return ask_question(df, '''Generate a concise executive summary covering:
1. Dataset overview
2. Top 3 insights
3. Data quality issues
4. 3 recommendations''')

def generate_suggestions(df: pd.DataFrame) -> list[str]:
    client = get_client()
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    categorical_cols = df.select_dtypes(exclude='number').columns.tolist()
    
    if not client:
        # Return elegant default business questions immediately if API is unconfigured!
        return [
            f"What are the main distribution trends in {numeric_cols[0]}?" if numeric_cols else "Which category has the highest representation?",
            "What are the top performance metrics and takeaways?",
            "Are there any outliers or data quality anomalies?",
            "What business recommendations do you have based on the columns?"
        ]
        
    columns_info = ', '.join(df.columns.tolist())
    
    prompt = f"""Based on the following dataset columns:
- Columns: {columns_info}
- Numeric columns: {', '.join(numeric_cols)}
- Categorical columns: {', '.join(categorical_cols)}

Generate exactly 4 diverse, analytical, business-oriented questions a manager or executive would want to ask about this dataset to find key insights, trends, or summaries.
Format the output as a simple list of questions, one per line, with no numbering, bullet points, introductory text, or markdown. Only output the questions themselves. For example:
What is the average profit by region?
What are the top 5 products by sales?
Is there a correlation between price and demand?
Are there any monthly trends in customer acquisition?"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {'role': 'user', 'content': prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        questions = response.choices[0].message.content.strip().split('\n')
        # Filter and clean up
        cleaned_questions = []
        for q in questions:
            q = q.strip().lstrip('1234567890.-*• ')
            if q and len(q) > 10 and q.endswith('?'):
                cleaned_questions.append(q)
        
        # Ensure we have exactly 4 questions (fallback if parsing fails)
        if len(cleaned_questions) < 4:
            fallbacks = [
                f"What are the trends in {numeric_cols[0]}?" if numeric_cols else "What are the main trends in the data?",
                f"How does {numeric_cols[-1]} perform across categories?" if len(numeric_cols) > 1 else "What are the top performance metrics?",
                f"Are there anomalies or data quality issues in the columns?",
                f"What are the top key takeaways and recommendations from this dataset?"
            ]
            cleaned_questions = (cleaned_questions + fallbacks)[:4]
        return cleaned_questions[:4]
    except Exception as e:
        print("Error generating AI suggestions:", e)
        # Default fallback questions
        return [
            "Which category has the highest values?",
            "What are the top 5 items by distribution?",
            "Are there anomalies in the numerical columns?",
            "What recommendations do you have based on this dataset?"
        ]