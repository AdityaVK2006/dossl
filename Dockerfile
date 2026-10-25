FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY app.js ./
COPY views ./views
COPY public ./public

USER node

EXPOSE 3000

CMD ["npm", "start"]