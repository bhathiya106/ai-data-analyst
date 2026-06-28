import pandas as pd
import numpy as np

def run_eda(df: pd.DataFrame) -> dict:
    report = {}

    # Basic dataset info
    report['shape'] = df.shape
    report['columns'] = df.columns.tolist()
    report['dtypes'] = df.dtypes.astype(str).to_dict()
    report['missing'] = df.isnull().sum().to_dict()

    # Numeric column statistics
    numeric_df = df.select_dtypes(include=[np.number])
    if not numeric_df.empty:
        # describe() gives count, mean, std, min, 25%, 50%, 75%, max
        report['stats'] = numeric_df.describe().round(2).to_dict()

        # Correlation matrix — how related are numeric columns to each other
        if len(numeric_df.columns) > 1:
            report['correlations'] = numeric_df.corr().round(2).to_dict()

        # Outlier detection using IQR (Interquartile Range) method
        outliers = {}
        for col in numeric_df.columns:
            Q1 = numeric_df[col].quantile(0.25)
            Q3 = numeric_df[col].quantile(0.75)
            IQR = Q3 - Q1
            # Values below Q1 - 1.5*IQR or above Q3 + 1.5*IQR are outliers
            n = ((numeric_df[col] < Q1 - 1.5*IQR) |
                 (numeric_df[col] > Q3 + 1.5*IQR)).sum()
            if n > 0:
                outliers[col] = int(n)
        report['outliers'] = outliers

    # Categorical summary — top 5 values per text column
    cat_df = df.select_dtypes(include=['object'])
    if not cat_df.empty:
        report['top_categories'] = {
            col: df[col].value_counts().head(5).to_dict()
            for col in cat_df.columns
        }

    return report