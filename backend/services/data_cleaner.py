import pandas as pd
import numpy as np

def load_file(file_path: str) -> pd.DataFrame:
    # Detect file type from extension and load accordingly
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    elif file_path.endswith(('.xlsx', '.xls')):
        return pd.read_excel(file_path)
    else:
        raise ValueError('Unsupported file type. Upload .csv or .xlsx only.')

def clean_data(df: pd.DataFrame):
    report = {}

    # Record missing values BEFORE fixing them
    missing = df.isnull().sum()
    report['missing_before'] = missing[missing > 0].to_dict()

    # Fill numeric columns with median (robust against outliers)
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col].fillna(df[col].median(), inplace=True)

    # Fill text columns with the most common value (mode)
    for col in df.select_dtypes(include=['object']).columns:
        mode = df[col].mode()
        df[col].fillna(mode[0] if not mode.empty else 'Unknown', inplace=True)

    # Remove exact duplicate rows
    dupes = df.duplicated().sum()
    df.drop_duplicates(inplace=True)
    report['duplicates_removed'] = int(dupes)

    # Capture detected data types and dataset dimensions
    report['dtypes'] = df.dtypes.astype(str).to_dict()
    report['shape'] = df.shape

    return df, report
