FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm install

COPY . .
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
