FROM node:14-alpine3.10

LABEL version="1.0"
LABEL description="Development image for the Library MERN API"

# workdir is where our code shall live in the container
# all commands executed relative to this directory
WORKDIR /app

COPY ["/server/package.json","/server/package-lock.json*","npm-shrinkwrap.json*", "./"]

# Install dependencies and clear npm cache
RUN npm install && npm cache clean --force

COPY . .

# use EXPOSE command to have our port mapped by the docker daemon
EXPOSE 5000

# default dev command
CMD [ "npm", "run", "dev" ]

FROM node:14-alpine3.10

WORKDIR /app

COPY [ "/client/package.json", "./"]
RUN npm install && npm cache clean --force
COPY . .

CMD ["npm", "run","start"]
