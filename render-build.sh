#!/bin/bash
# Instalar Chromium
apt-get update && apt-get install -y chromium fonts-liberation --no-install-recommends && rm -rf /var/lib/apt/lists/*
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
npm install
