# ===============================================
# 1️⃣ Base image
# ===============================================
FROM node:20-bullseye-slim AS base

# Install core dependencies for OCR and image conversion
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    imagemagick \
    graphicsmagick \
    ghostscript \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ✅ Copy Hindi traineddata file from project root into tessdata
COPY hin.traineddata /usr/share/tesseract-ocr/5/tessdata/hin.traineddata

# ===============================================
# 2️⃣ App setup
# ===============================================
WORKDIR /app

COPY package*.json ./
RUN npm ci 

COPY . .

# ===============================================
# 3️⃣ Build Next.js app
# ===============================================
RUN npm run build

# ===============================================
# 4️⃣ Run stage
# ===============================================
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
