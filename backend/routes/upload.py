from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import shutil
import os
from backend.services.data_cleaner import load_file, clean_data

router = APIRouter()

@router.post('/upload')
async def upload_file(file: UploadFile = File(...)):

    # Create uploads folder if it doesn't exist
    os.makedirs("uploads", exist_ok=True)

    # Save uploaded file
    file_path = f'uploads/{file.filename}'

    with open(file_path, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Clean the data
    df, report = clean_data(load_file(file_path))

    # Save cleaned version
    df.to_csv('uploads/cleaned_data.csv', index=False)

    return JSONResponse({
        'message': 'File uploaded and cleaned successfully',
        'filename': file.filename,
        'rows': report['shape'][0],
        'columns': report['shape'][1],
        'missing_fixed': report['missing_before'],
        'duplicates_removed': report['duplicates_removed'],
        'dtypes': report['dtypes']
    })