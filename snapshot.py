import asyncio
import json
import os
from datetime import datetime
import aiohttp
import regex

async def get_data_from_api():
    url = "https://api2.hiveos.farm/api/v2/hive/stats"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                response.raise_for_status()  # Raise an exception for non-200 status codes
                apidata = await response.json()
                return apidata

    except aiohttp.ClientError as e:
        print(f"Error: {e}")
        return None

async def clean_data(data):
    # Create a dictionary to store the cleaned data
    cleaned_data = {}

    # Define a list of names to be removed
    names_to_remove = ["SMH \u6c38\u5dde"]

    # Get the current timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Iterate over the sets of data (e.g. coins, algos, nvidia_models, amd_models)
    for set_name, items in data.items():
        # Create a dictionary to store the cleaned items for this set
        cleaned_set = {}

        # Iterate over the items in the set
        for item in items:
            # Get the name and amount from the item
            name = item["name"]
            amount = item["amount"]

            # Remove special characters and Unicode characters from the name
            clean_name = regex.sub(r'[^\w\s\p{L}]', '_', name, flags=regex.UNICODE)

            # Convert the cleaned name to uppercase
            clean_name = clean_name.upper()

            # Check if the cleaned name is valid and not in the list of names to remove
            if clean_name not in names_to_remove:
                # If the cleaned name is valid, add it to the cleaned_set dictionary with the amount and snapshot timestamp
             # Convert the amount to a percentage value
                amount_percentage = amount * 100    
                if clean_name in cleaned_set:
                    cleaned_set[clean_name]["amount"] += amount_percentage
                else:
                    cleaned_set[clean_name] = {
                        "name": clean_name,
                        "amount": amount_percentage,
                        "snapshot": timestamp
                    }

        # Add the cleaned set to the cleaned_data dictionary
        cleaned_data[set_name] = cleaned_set

    # Return the cleaned data dictionary
    return cleaned_data


# Function to store the data in JSON format
async def store_data(data, filename):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    month = datetime.now().strftime("%b").lower()  # Three-letter abbreviation of the month
    data_folder = "data"  # Specify the path to your data folder

    # Check the current permissions of the data folder
    current_permissions = os.stat(data_folder).st_mode
    print(f"Current permissions of the data folder: {oct(current_permissions)}")

    # Set the permissions of the data folder to read, write, and execute for the owner, read and execute for the group, and read and execute for others
    new_permissions = 0o755
    os.chmod(data_folder, new_permissions)
    print(f"New permissions of the data folder: {oct(new_permissions)}")


    # Create the data folder if it doesn't exist
    file_path = os.path.join(data_folder, f"{filename}_{month}_{timestamp}.json")

    os.makedirs(data_folder, exist_ok=True)  # Create the data folder if it doesn't exist

    # Write the data to the JSON file
    with open(file_path, "w") as file:
        json.dump(data, file)
        print(f"Data created: {file_path}")


# Run the asynchronous functions
data = asyncio.run(get_data_from_api())
if data:
    raw_data = data.copy()
    cleaned_data = asyncio.run(clean_data(data))
    asyncio.run(store_data(raw_data, "raw_data"))
    asyncio.run(store_data(cleaned_data, "cleaned_data"))