# PROD CONFIG
FROM node as prod

WORKDIR /app

COPY ./package*.json ./

COPY . .

RUN npm install

ENV NODE_ENV=production

CMD ["npm","start"]

#DEV CONFIG
# FROM prod as dev

# EXPOSE 5000 3000

# ENV NODE_ENV=development

# RUN npm install -g nodemon

# RUN npm install --only=dev

# CMD [ "npm", "run", "dev" ]
