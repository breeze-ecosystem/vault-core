FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Install openssl for MQTT TLS cert verification at runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
CMD ["python", "-m", "main"]
