import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import os

OUTPUT_DIR = 'outputs'

def generate_charts(df: pd.DataFrame) -> list:
    charts = []
    df_chart = df.copy()
    
    # Strictly select numeric and categorical columns
    numeric_cols = df_chart.select_dtypes(include=['number']).columns.tolist()
    cat_cols = df_chart.select_dtypes(include=['object', 'category', 'string']).columns.tolist()

    # Make sure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── 1. Bar chart: top categories vs first numeric column
    if cat_cols and numeric_cols:
        try:
            col_cat = cat_cols[0]
            col_num = numeric_cols[0]
            grouped = (df_chart.groupby(col_cat)[col_num]
                        .sum().sort_values(ascending=False).head(10))
            fig = px.bar(grouped, title=f'Top {col_cat} by {col_num}')
            path = f'{OUTPUT_DIR}/bar_{col_cat}_{col_num}.html'
            fig.write_html(path)
            charts.append({'type': 'bar', 'path': path, 'title': fig.layout.title.text})
        except Exception as e:
            print("Bar chart generation skipped:", e)

    # ── 2. Line chart: auto-detect date column for time-series (on a temporary copy)
    try:
        df_time = df_chart.copy()
        date_cols = df_time.select_dtypes(include=['datetime64']).columns.tolist()
        if not date_cols:
            for col in df_time.columns:
                if col not in numeric_cols:  # Avoid converting numeric metric columns to datetime!
                    try:
                        df_time[col] = pd.to_datetime(df_time[col])
                        date_cols.append(col)
                        break
                    except Exception:
                        pass

        if date_cols and numeric_cols:
            fig = px.line(df_time.sort_values(date_cols[0]),
                          x=date_cols[0], y=numeric_cols[0],
                          title=f'{numeric_cols[0]} over time')
            path = f'{OUTPUT_DIR}/line_time.html'
            fig.write_html(path)
            charts.append({'type': 'line', 'path': path, 'title': fig.layout.title.text})
    except Exception as e:
        print("Line chart generation skipped:", e)

    # ── 3. Heatmap: correlation between numeric columns
    if len(numeric_cols) > 1:
        try:
            corr = df_chart[numeric_cols].corr()
            fig = go.Figure(data=go.Heatmap(
                z=corr.values, x=corr.columns, y=corr.columns,
                colorscale='RdBu', zmid=0))
            fig.update_layout(title='Correlation heatmap')
            path = f'{OUTPUT_DIR}/heatmap.html'
            fig.write_html(path)
            charts.append({'type': 'heatmap', 'path': path, 'title': 'Correlation heatmap'})
        except Exception as e:
            print("Heatmap generation skipped:", e)

    # ── 4. Pie Chart: Category share of numerical values
    if cat_cols and numeric_cols:
        try:
            col_cat = cat_cols[0]
            col_num = numeric_cols[0]
            grouped = df_chart.groupby(col_cat)[col_num].sum().reset_index()
            # Limit to top 8 items and group rest as "Other" to keep it readable
            if len(grouped) > 8:
                top_grouped = grouped.sort_values(by=col_num, ascending=False).head(8)
                other_sum = grouped.sort_values(by=col_num, ascending=False).iloc[8:][col_num].sum()
                other_row = pd.DataFrame([{col_cat: 'Other', col_num: other_sum}])
                grouped = pd.concat([top_grouped, other_row], ignore_index=True)
            
            fig = px.pie(grouped, values=col_num, names=col_cat, title=f'Market Share: {col_num} by {col_cat}', hole=0.4)
            fig.update_traces(textposition='inside', textinfo='percent+label')
            path = f'{OUTPUT_DIR}/pie_{col_cat}_{col_num}.html'
            fig.write_html(path)
            charts.append({'type': 'pie', 'path': path, 'title': fig.layout.title.text})
        except Exception as e:
            print("Pie chart generation skipped:", e)

    # ── 5. Scatter Plot: Relationship between two numeric columns
    if len(numeric_cols) > 1:
        try:
            col_num1 = numeric_cols[0]
            col_num2 = numeric_cols[1]
            fig = px.scatter(df_chart, x=col_num1, y=col_num2, title=f'Relationship: {col_num1} vs {col_num2}')
            path = f'{OUTPUT_DIR}/scatter_{col_num1}_{col_num2}.html'
            fig.write_html(path)
            charts.append({'type': 'scatter', 'path': path, 'title': fig.layout.title.text})
        except Exception as e:
            print("Scatter plot generation skipped:", e)

    # ── 6. Histogram for first 3 numeric columns
    for col in numeric_cols[:3]:
        try:
            fig = px.histogram(df_chart, x=col, title=f'Distribution of {col}')
            path = f'{OUTPUT_DIR}/hist_{col}.html'
            fig.write_html(path)
            charts.append({'type': 'histogram', 'path': path, 'title': fig.layout.title.text})
        except Exception as e:
            print(f"Histogram for {col} skipped:", e)

    return charts
