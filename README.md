# hiveOSstats
Hive OS stats

## Description
This is a web application that provides statistics about the Hive OS mining platform. It uses data from the Hive OS API and presents it in a user-friendly format.

## Functionality
- View statistics about coins, algos, GPU brands, NVIDIA models, AMD models, and miners.
- Generate Excel reports based on the data.
- Take a snapshot of the data.
- Reload the data from the API.

## Installation
1. Clone the repository: ```git clone <>```


## Running & Dependencies

Depending on how you want to run the application, either natively or via docker

- Natively:
    - You will need to isntall all the dependencies: ```pip install -r requirements.txt```
    - Run the app with: ```python3 app.py```
- Docker:
    - Ensure you have docker installed: ```apt install docker.io```
    - Create the image: ```sudo docker build -t <whatever you want to call the app>```
    - Run the image: ```docker run -p 8050:8050 -v /:/app/data <whatever its called by now>```



