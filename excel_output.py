import os
import pandas as pd
import json
import glob

def generate_dataframes(data_dir):
    # Get all cleaned_data.json files in the data directory
    cleaned_data_files = glob.glob(os.path.join(data_dir, 'cleaned_data*.json'))

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

    # Return the dataframes
    return coins, algos, gpu_brands, nvidia_models, amd_models, miners

data_dir = 'data'
coins, algos, gpu_brands, nvidia_models, amd_models, miners = generate_dataframes(data_dir)

def export_snapshot_to_excel(dataframes, excel_file):
    writersnapshot = pd.ExcelWriter(snapshot_excel_file, engine='xlsxwriter')
    for df_name, df in dataframes.items():
        df.to_excel(writersnapshot, sheet_name=df_name, index=False)
    writersnapshot._save()
    print(f"Data created: {excel_file}")

# Name of dataframes 
dataframes = {
    'Coins': coins,
    'Algos': algos,
    'GPU Brands': gpu_brands,
    'NVIDIA Models': nvidia_models,
    'AMD Models': amd_models,
    'Miners': miners
}
snapshot_excel_file = 'snapshot_output.xlsx'
export_snapshot_to_excel(dataframes, snapshot_excel_file)

def create_differences_excel(dataframes, output_file):
    # Create a new Excel writer object
    writer = pd.ExcelWriter(output_file, engine='xlsxwriter')

    # Iterate over each dataframe in the dataframes dictionary
    for df_name, df in dataframes.items():
        # Calculate the differences between consecutive snapshots for each name
        df_diff = df.sort_values('snapshot').groupby('name')['amount'].apply(lambda x: x.diff().iloc[-1] if len(x) >= 2 else None).reset_index(name='amount_difference')

        # Write the differences dataframe to a new sheet in the Excel file
        df_diff.to_excel(writer, sheet_name=f'{df_name}_diff', index=False)

    # Save the Excel file
    writer._save()

    # Print a message indicating that the data has been created
    print(f"Data created: {output_file}")

differences_output_file = 'differences_output.xlsx'
create_differences_excel(dataframes, differences_output_file)

def create_daily_pivot_excel(dataframes, pivot_daily_output_file):
    # Create a new Excel writer object
    pivotwriter = pd.ExcelWriter(pivot_daily_output_file, engine='xlsxwriter')

    # Create a pivot table
    for df_name, df in dataframes.items():
        pivot_table = df.pivot_table(index='name', columns='snapshot', values='amount').reset_index()
        pivot_table.to_excel(pivotwriter, sheet_name=f'{df_name}_Pivot', index=False)

    # Save the Excel file
    pivotwriter._save()

    # Print a message indicating that the data has been created
    print(f"Data created: {pivot_daily_output_file}")

# Call the function
pivot_daily_output_file = 'pivot_daily_output.xlsx'
create_daily_pivot_excel(dataframes, pivot_daily_output_file)

def create_monthly_pivot_excel(dataframes, pivot_monthly_output_file):
    # Create a new Excel writer object
    pivotwriter = pd.ExcelWriter(pivot_monthly_output_file, engine='xlsxwriter')

    # Create a pivot table and aggregate values to monthly
    for df_name, df in dataframes.items():
        df['snapshot'] = pd.to_datetime(df['snapshot'])
        df['month'] = df['snapshot'].dt.to_period('M')
        pivot_table = df.pivot_table(index='name', columns='month', values='amount', aggfunc='mean').reset_index()
        pivot_table.to_excel(pivotwriter, sheet_name=f'{df_name}_Pivot', index=False)

    # Save the Excel file
    pivotwriter._save()

    # Print a message indicating that the data has been created
    print(f"Data created: {pivot_monthly_output_file}")

# Call the function
pivot_monthly_output_file = 'pivot_monthly_output.xlsx'
create_monthly_pivot_excel(dataframes, pivot_monthly_output_file)