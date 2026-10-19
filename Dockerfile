FROM node:24.20.0-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

RUN npm run build

CMD ["node", "dist/server.js"]