from fastapi import APIRouter, HTTPException
import pandas as pd
from backend.services.eda import run_eda
from backend.services.visualizer import generate_charts
from backend.services.ml_engine import forecast_sales
from backend.services.ai_assistant import generate_suggestions
import os

router = APIRouter()

@router.get('/analyze')
def analyze(file_path: str = 'uploads/cleaned_data.csv'):
    # Ensure absolute pathing resolution
    if not os.path.isabs(file_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, file_path)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No active dataset found.")
        
    df = pd.read_csv(file_path)

    # Run all analysis services
    eda = run_eda(df)
    charts = generate_charts(df)
    suggestions = generate_suggestions(df)

    # Auto-forecast the first numeric column found
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    forecast = None
    if numeric_cols:
        forecast = forecast_sales(df, numeric_cols[0])

    return {
        'eda': eda,
        'charts': [{'type': c['type'], 'path': f"/outputs/{os.path.basename(c['path'])}", 'title': c['title']} for c in charts],
        'forecast': forecast,
        'suggestions': suggestions
    }

@router.get('/groupby')
def groupby(cat_col: str, num_col: str, file_path: str = 'uploads/cleaned_data.csv'):
    # Ensure absolute pathing resolution
    if not os.path.isabs(file_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, file_path)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No active dataset found.")
    try:
        df = pd.read_csv(file_path)
        grouped = df.groupby(cat_col)[num_col].sum().sort_values(ascending=False).head(10)
        return {'labels': grouped.index.tolist(), 'values': [float(v) for v in grouped.values]}
    except Exception as e:
        return {'error': str(e)}


