# Enbia Questionário Horta — 1 container Node que serve API + frontend estático + /admin.
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./
COPY frontend/ ./frontend/
RUN mkdir -p /app/data

EXPOSE 4400

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||4400)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
