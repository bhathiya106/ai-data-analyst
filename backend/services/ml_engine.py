import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score

def forecast_sales(df: pd.DataFrame, target_col: str,
                   periods: int = 3) -> dict:
    '''
    Forecasts the next N values of a numeric column using
    linear regression on the row index as the time dimension.
    '''
    series = df[target_col].dropna().reset_index(drop=True)
    X = np.arange(len(series)).reshape(-1, 1)   # time steps
    y = series.values

    model = LinearRegression()
    model.fit(X, y)

    # Predict the next N periods
    future_X = np.arange(len(series), len(series) + periods).reshape(-1, 1)
    predictions = model.predict(future_X).tolist()

    y_pred = model.predict(X)
    return {
        'predictions': [round(p, 2) for p in predictions],
        'r2_score': round(r2_score(y, y_pred), 3),
        'mae': round(mean_absolute_error(y, y_pred), 2),
        # Positive slope means the trend is going up
        'trend': 'upward' if model.coef_[0] > 0 else 'downward'
    }

def segment_customers(df: pd.DataFrame, numeric_cols: list,
                      n_clusters: int = 3) -> dict:
    '''
    Groups rows into N clusters using KMeans.
    StandardScaler ensures no single column dominates due to scale.
    '''
    data = df[numeric_cols].dropna()
    scaler = StandardScaler()
    scaled = scaler.fit_transform(data)

    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = km.fit_predict(scaled)

    df_copy = data.copy()
    df_copy['segment'] = labels
    summary = df_copy.groupby('segment').mean().round(2).to_dict()

    return {
        'n_clusters': n_clusters,
        'segment_sizes': pd.Series(labels).value_counts().to_dict(),
        'segment_means': summary
    }
