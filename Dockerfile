# Use an official Python runtime as a parent image
FROM python:3.9

# Set the working directory
WORKDIR /app

# Copy data accross
COPY . /app

# Install necessary dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir -r /app/requirements.txt

# Expose port 8050
EXPOSE 8050

# Set the command to run the application when the container starts
CMD ["python", "app.py"]