import streamlit as st
import pandas as pd
import requests
import plotly.express as px
import os

API_URL = 'http://localhost:8000/api'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')

st.set_page_config(page_title='AI Data Analyst', layout='wide')
st.title('AI Data Analyst Assistant')

page = st.sidebar.radio('Navigate',
    ['Upload & Clean', 'Dashboard', 'AI Chat', 'Report'])

if page == 'Upload & Clean':
    st.header('Upload your dataset')
    file = st.file_uploader('Choose a CSV or Excel file', type=['csv', 'xlsx'])

    if file:
        file_path = os.path.join(UPLOADS_DIR, file.name)
        with open(file_path, 'wb') as f:
            f.write(file.read())

        res = requests.post(f'{API_URL}/upload',
                            files={'file': open(file_path, 'rb')})
        result = res.json()

        st.success(f"Uploaded: {result['rows']} rows x {result['columns']} columns")
        col1, col2 = st.columns(2)
        col1.metric('Rows', result['rows'])
        col1.metric('Columns', result['columns'])
        col2.metric('Duplicates removed', result['duplicates_removed'])
        col2.metric('Columns with missing values', len(result['missing_fixed']))

        if result['missing_fixed']:
            st.subheader('Missing values fixed')
            st.json(result['missing_fixed'])

        st.subheader('Data types detected')
        st.json(result['dtypes'])

elif page == 'Dashboard':
    st.header('Exploratory Analysis Dashboard')
    if st.button('🔄 Refresh Data'):
        st.rerun()
    try:
        df = pd.read_csv(os.path.join(UPLOADS_DIR, 'cleaned_data.csv'))
        numeric_cols = df.select_dtypes(include='number').columns.tolist()
        cat_cols = df.select_dtypes(include='object').columns.tolist()

        st.subheader('Dataset statistics')
        st.dataframe(df.describe().round(2), use_container_width=True)

        if cat_cols and numeric_cols:
            st.subheader('Category breakdown')
            cat_col = st.selectbox('Category column', cat_cols)
            num_col = st.selectbox('Numeric column', numeric_cols)
            grouped = (df.groupby(cat_col)[num_col]
                        .sum().sort_values(ascending=False).head(10))
            st.plotly_chart(px.bar(grouped,
                title=f'Top {cat_col} by {num_col}'),
                use_container_width=True)

        if len(numeric_cols) > 1:
            st.subheader('Correlation heatmap')
            corr = df[numeric_cols].corr()
            st.plotly_chart(
                px.imshow(corr, color_continuous_scale='RdBu', zmin=-1, zmax=1),
                use_container_width=True)

        st.subheader('Forecast')
        if numeric_cols:
            res = requests.get(f'{API_URL}/analyze')
            if res.status_code == 200:
                forecast = res.json().get('forecast', {})
                if forecast:
                    c1, c2, c3 = st.columns(3)
                    c1.metric('Trend', forecast['trend'])
                    c2.metric('R² score', forecast['r2_score'])
                    c3.metric('MAE', forecast['mae'])
                    st.write('Next periods forecast:', forecast['predictions'])

    except FileNotFoundError:
        st.info('Upload a file first using the Upload & Clean page.')

elif page == 'AI Chat':
    st.header('Ask your data anything')

    suggestions = [
        'Which region has the highest sales?',
        'What are the top 5 products by revenue?',
        'Are there anomalies in the data?',
        'What recommendations do you have?',
        'Which month has the highest sales?'
    ]

    st.write('**Suggested questions:**')
    cols = st.columns(3)
    for i, q in enumerate(suggestions[:3]):
        if cols[i].button(q):
            st.session_state['question'] = q

    question = st.text_input('Your question',
        value=st.session_state.get('question', ''))

    if st.button('Ask') and question:
        with st.spinner('Analysing...'):
            res = requests.post(f'{API_URL}/chat', json={'question': question})
            st.markdown('**Answer:**')
            st.write(res.json()['answer'])

elif page == 'Report':
    st.header('Executive Summary')
    if st.button('Generate AI executive summary'):
        with st.spinner('Generating...'):
            res = requests.get(f'{API_URL}/summary')
            st.markdown(res.json()['summary'])