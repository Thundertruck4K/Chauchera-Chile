FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ cairo-dev pango-dev

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/uploads /app/logs

EXPOSE 4000

CMD ["node", "src/server.js"]
