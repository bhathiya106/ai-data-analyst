import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

OUTPUT_DIR = 'outputs'

def generate_charts(df: pd.DataFrame) -> list:
    charts = []
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    cat_cols = df.select_dtypes(include='object').columns.tolist()

    # ── Bar chart: top categories vs first numeric column
    if cat_cols and numeric_cols:
        col_cat = cat_cols[0]
        col_num = numeric_cols[0]
        grouped = (df.groupby(col_cat)[col_num]
                    .sum().sort_values(ascending=False).head(10))
        fig = px.bar(grouped, title=f'Top {col_cat} by {col_num}')
        path = f'{OUTPUT_DIR}/bar_{col_cat}_{col_num}.html'
        fig.write_html(path)
        charts.append({'type': 'bar', 'path': path,
                       'title': fig.layout.title.text})

    # ── Line chart: auto-detect any date column for time-series
    date_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
    if not date_cols:
        for col in df.columns:
            try:
                df[col] = pd.to_datetime(df[col])
                date_cols.append(col)
                break
            except Exception:
                pass

    if date_cols and numeric_cols:
        fig = px.line(df.sort_values(date_cols[0]),
                      x=date_cols[0], y=numeric_cols[0],
                      title=f'{numeric_cols[0]} over time')
        path = f'{OUTPUT_DIR}/line_time.html'
        fig.write_html(path)
        charts.append({'type': 'line', 'path': path,
                       'title': fig.layout.title.text})

    # ── Heatmap: correlation between numeric columns
    if len(numeric_cols) > 1:
        corr = df[numeric_cols].corr()
        fig = go.Figure(data=go.Heatmap(
            z=corr.values, x=corr.columns, y=corr.columns,
            colorscale='RdBu', zmid=0))
        fig.update_layout(title='Correlation heatmap')
        path = f'{OUTPUT_DIR}/heatmap.html'
        fig.write_html(path)
        charts.append({'type': 'heatmap', 'path': path,
                       'title': 'Correlation heatmap'})

    # ── Histogram for first 3 numeric columns
    for col in numeric_cols[:3]:
        fig = px.histogram(df, x=col, title=f'Distribution of {col}')
        path = f'{OUTPUT_DIR}/hist_{col}.html'
        fig.write_html(path)
        charts.append({'type': 'histogram', 'path': path,
                       'title': fig.layout.title.text})

    return charts
