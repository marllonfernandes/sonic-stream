FROM node:20-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    rubberband-cli \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Install Python dependencies (Spleeter, yt-dlp, and librosa for chord_extractor)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir spleeter yt-dlp librosa numpy

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV PYTHON=/opt/venv/bin/python
# Ensure spleeter models don't bloat memory if they can be cached in tmp, but including them in image is faster
# To do so, run a dummy extraction during build or let it download at runtime. 
# Pre-downloading 5stems is highly recommended for Cloud Run so it doesn't timeout on first request
RUN mkdir -p /app/pretrained_models && \
    spleeter separate -p spleeter:5stems -i /dev/null -o /tmp || true

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
