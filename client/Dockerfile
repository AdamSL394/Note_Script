FROM node:14-alpine3.10

WORKDIR /app

COPY ./package.json ./
RUN npm install && npm cache clean --force
COPY . .

CMD ["npm", "run","start"]
