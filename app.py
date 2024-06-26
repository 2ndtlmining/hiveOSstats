from dash import Dash, html, dcc, callback, Output, Input
import plotly.express as px
import pandas as pd
import glob, json, os
import dash_bootstrap_components as dbc
from dash_bootstrap_templates import load_figure_template
from datetime import datetime, timedelta, timezone
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
import logging

load_figure_template(["cyborg", "darkly"])

data_dir = 'data'

def check_and_take_snapshot():
    # Get all cleaned_data.json files in the data directory
    print("Checking and taking snapshot process started...")
    cleaned_data_files = sorted(glob.glob(os.path.join(data_dir, 'cleaned_data*.json')), key=os.path.getmtime, reverse=True)
    print("Cleaned files are: ", cleaned_data_files)

    if cleaned_data_files:
        # Get the latest cleaned data file
        latest_file = cleaned_data_files[0]
        print("Latest file is: ", latest_file)

        # Read the first record from the file
        with open(latest_file) as f:
            data = json.load(f)
            first_record = list(data.values())[0]
            snapshot_time = datetime.strptime(next(iter(first_record.values()))['snapshot'], "%Y-%m-%d %H:%M:%S")
            snapshot_time = snapshot_time.replace(tzinfo=timezone.utc).astimezone(tz=None)
            print(f"Snapshot time: {snapshot_time}")
            current_time = datetime.now(timezone.utc).astimezone(tz=None)
            print(f"Current time: {current_time}")

            if snapshot_time < current_time - timedelta(days=1):
                try:
                    # Run the snapshot.py script
                    with ThreadPoolExecutor() as executor:
                        executor.submit(subprocess.run, ['python3', 'snapshot.py'], check=True)
                    logging.info("Snapshot taken successfully!")
                    logging.info(f"Current time: {current_time}")
                except subprocess.CalledProcessError as e:
                    logging.error(f"Error running snapshot.py: {e}")
            else:
                logging.info(f"No snapshot taken. Last snapshot ({latest_file}) is less than 24 hours old.")
                logging.info(f"Snapshot time: {snapshot_time}")
                logging.info(f"Current time: {current_time}")
    else:
        logging.info("No cleaned data files found.")

# Schedule the check_and_take_snapshot function to run every hour
def run_scheduler():
    while True:
        print("Running scheduler...")
        check_and_take_snapshot()
        time.sleep(60 * 60)  # Sleep for 1 hour

scheduler_thread = ThreadPoolExecutor().submit(run_scheduler)



def generate_dataframes(data_dir):
    # Get all cleaned_data.json files in the data directory

    print("Generating dataframes process started...")
    cleaned_data_files = glob.glob(os.path.join(data_dir, 'cleaned_data*.json'))

    # Print the cleaned data files
    print(f"Cleaned data files read into report: {cleaned_data_files}")

    # Initialize empty dataframes
    coins = pd.DataFrame()
    algos = pd.DataFrame()
    gpu_brands = pd.DataFrame()
    nvidia_models = pd.DataFrame()
    amd_models = pd.DataFrame()
    miners = pd.DataFrame()

    # Iterate over each cleaned_data.json file
    for file in cleaned_data_files:
        # Load the JSON data from the file
        with open(file) as f:
            data = json.load(f)
            print('Json file loaded...')

        # Extract the data for each section
        coins_data = []
        for coin, coin_data in data.get('coins', {}).items():
            coin_data['name'] = coin
            coins_data.append(coin_data)
        coins = pd.concat([coins, pd.DataFrame(coins_data)], ignore_index=True)

        algos_data = []
        for algo, algo_data in data.get('algos', {}).items():
            algo_data['name'] = algo
            algos_data.append(algo_data)
        algos = pd.concat([algos, pd.DataFrame(algos_data)], ignore_index=True)

        gpu_brands_data = []
        for brand, brand_data in data.get('gpu_brands', {}).items():
            brand_data['name'] = brand
            gpu_brands_data.append(brand_data)
        gpu_brands = pd.concat([gpu_brands, pd.DataFrame(gpu_brands_data)], ignore_index=True)

        nvidia_models_data = []
        for model, model_data in data.get('nvidia_models', {}).items():
            model_data['name'] = model
            nvidia_models_data.append(model_data)
        nvidia_models = pd.concat([nvidia_models, pd.DataFrame(nvidia_models_data)], ignore_index=True)

        amd_models_data = []
        for model, model_data in data.get('amd_models', {}).items():
            model_data['name'] = model
            amd_models_data.append(model_data)
        amd_models = pd.concat([amd_models, pd.DataFrame(amd_models_data)], ignore_index=True)

        miners_data = []
        for miner, miner_data in data.get('miners', {}).items():
            miner_data['name'] = miner
            miners_data.append(miner_data)
        miners = pd.concat([miners, pd.DataFrame(miners_data)], ignore_index=True)
        
    print("Dataframes generated successfully.")
    # Return the dataframes
    return coins, algos, gpu_brands, nvidia_models, amd_models, miners
reports = {'Coins': 'coins', 'Algos': 'algos', 'GPU Brands': 'gpu_brands', 'NVIDIA Models': 'nvidia_models', 'AMD Models': 'amd_models', 'Miners': 'miners'}
coins, algos, gpu_brands, nvidia_models, amd_models, miners = generate_dataframes(data_dir)


# Dash app
app = Dash(__name__, external_stylesheets = [dbc.themes.BOOTSTRAP, dbc.themes.DARKLY])


# Graph
@callback(
    Output('graph-content', 'figure'),
    Input('report-selection', 'value'),
    Input('dropdown-selection', 'value')
)
def update_graph(report_value, dropdown_value):
    if report_value == 'Coins':
        dff = coins[coins.name == dropdown_value]
    elif report_value == 'Algos':
        dff = algos[algos.name == dropdown_value]
    elif report_value == 'GPU Brands':
        dff = gpu_brands[gpu_brands.name == dropdown_value]
    elif report_value == 'NVIDIA Models':
        dff = nvidia_models[nvidia_models.name == dropdown_value]
    elif report_value == 'AMD Models':
        dff = amd_models[amd_models.name == dropdown_value]
    elif report_value == 'Miners':
        dff = miners[miners.name == dropdown_value]
    else:
        dff = pd.DataFrame()

    if not dff.empty:
        dff = dff.copy()  # Create a new DataFrame copy
        dff['snapshot'] = pd.to_datetime(dff['snapshot'])  # Convert 'snapshot' column to datetime
        dff = dff.groupby(pd.Grouper(key='snapshot', freq='D')).agg({'amount': 'mean'})

        # Fill missing values in the 'amount' column with forward and backward filling
        dff['amount'] = dff['amount'].fillna(method='ffill').fillna(method='bfill')


        figure = px.line(dff, x=dff.index, y='amount', markers=True, template='plotly_dark').update_layout(yaxis_title='%')
        print('Graph updated successfully.')

        return figure
    
    else:
        return {}



# Dropdown button filter
@callback(
    Output('dropdown-selection', 'options'),
    Input('report-selection', 'value')
)
def update_dropdown_options(report_value):
    if report_value == 'Coins':
        options = coins.loc[coins['name'].notnull(), 'name'].unique().tolist()
        options = [{'label': name, 'value': name} for name in options]
    elif report_value == 'Algos':
        options = algos.loc[algos['name'].notnull(), 'name'].unique().tolist()
        options = [{'label': name, 'value': name} for name in options]
    elif report_value == 'GPU Brands':
        options = gpu_brands.loc[gpu_brands['name'].notnull(), 'name'].unique().tolist()
        options = [{'label': name, 'value': name} for name in options]
    elif report_value == 'NVIDIA Models':
        options = nvidia_models.loc[nvidia_models['name'].notnull(), 'name'].unique().tolist()
        options = [{'label': name, 'value': name} for name in options]
    elif report_value == 'AMD Models':
        options = amd_models.loc[amd_models['name'].notnull(), 'name'].unique().tolist()
        options = [{'label': name, 'value': name} for name in options]
    elif report_value == 'Miners':
        options = miners.loc[miners['name'].notnull(), 'name'].unique().tolist()
        options = [{'label': name, 'value': name} for name in options]
    else:
        options = []

    return options
# Snapshot
@app.callback(
    Output('snapshot-output', 'children'),
    Input('snapshot-button', 'n_clicks')
)
def take_snapshot(n_clicks):
    if n_clicks > 0:
        import subprocess
        subprocess.run(['python3', 'snapshot.py'])
        return html.Div('Snapshot taken successfully.')
    else:
        print("Snapshot not taken.")
        return html.Div()

# Excel output
@app.callback(
    Output('excel-output', 'children'),
    Input('excel-button', 'n_clicks')
)
def run_excel_output(n_clicks):
    if n_clicks > 0:
        import subprocess
        subprocess.run(['python3', 'excel_output.py'])
        return html.Div('Excel output generated successfully.')
    else:
        print("Excel output not generated.")
        return html.Div()

# Reload the data 
@app.callback(
    Output('reload-output', 'children'),
    Input('reload-button', 'n_clicks')
)
def reload_data(n_clicks):
    if n_clicks > 0:
        global coins, algos, gpu_brands, nvidia_models, amd_models, miners
        coins, algos, gpu_brands, nvidia_models, amd_models, miners = generate_dataframes(data_dir)  # Call the generate_dataframes function
        print ("Data reloaded successfully.")
        return html.Div('Data reloaded successfully.'),
    else:
        print("Data not reloaded.")
        return html.Div()



#App Layout
app.layout = html.Div(
    id='app-container',
    className='container',
    children=[
        html.H1(
            'Hive OS stats',
            className='text-center text-green'
        ),
        dbc.Select(
            options=reports,
            value='',
            id='report-selection',
            className='mb-2'
        ),
        dbc.Select(
            options=[],
            value='',
            id='dropdown-selection',
            className='mb-2'
        ),
        dcc.Graph(
            id='graph-content',
            className='h-400'
            ),
        html.Div(
            id='Functions',
            className='d-flex justify-content-center',
            children=[
                dbc.Button('Take Snapshot', id='snapshot-button', n_clicks=0, color="primary", className="me-1"),
                dbc.Button('Run Excel Output', id='excel-button', n_clicks=0, color="primary", className="me-1"),
                dbc.Button('Reload Data', id='reload-button', n_clicks=0)
            ]
        ),
        html.Div(id='snapshot-output'),
        html.Div(id='excel-output'),
        html.Div(id='reload-output'),
        ])

if __name__ == '__main__':
    app.run_server(host='0.0.0.0', port=8050, debug=True)