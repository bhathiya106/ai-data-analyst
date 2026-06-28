from fastapi import APIRouter
import pandas as pd
from backend.services.eda import run_eda
from backend.services.visualizer import generate_charts
from backend.services.ml_engine import forecast_sales

router = APIRouter()

@router.get('/analyze')
def analyze(file_path: str = 'uploads/cleaned_data.csv'):
    df = pd.read_csv(file_path)

    # Run all analysis services
    eda = run_eda(df)
    charts = generate_charts(df)

    # Auto-forecast the first numeric column found
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    forecast = None
    if numeric_cols:
        forecast = forecast_sales(df, numeric_cols[0])

    return {
        'eda': eda,
        'charts': [c['title'] for c in charts],
        'forecast': forecast
    }

