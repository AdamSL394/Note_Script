# PROD CONFIG
FROM node:18 as prod

WORKDIR /app

# Install server dependencies first (includes typescript/ts-node as
# devDependencies — needed here to run the build step below, even
# though they're not needed once the compiled JS exists).
COPY ./server/package*.json ./server/
RUN npm install --prefix server

# Install client dependencies, then build. REACT_APP_HOST is a build ARG
# because Create React App bakes REACT_APP_* vars into the compiled JS
# at build time, not runtime — so dev and prod need two separately built
# images, each with the right value baked in, rather than one shared
# image configured at deploy time.
ARG REACT_APP_HOST=production
ENV REACT_APP_HOST=$REACT_APP_HOST

COPY ./client/package*.json ./client/
RUN npm install --prefix client
COPY ./client ./client
RUN npm run build --prefix client

# Copy server source and compile TypeScript -> server/dist/*.js.
COPY ./server ./server
# tsc statically imports config.json (resolveJsonModule) to type-check
# against its shape, so the file has to exist at build time -- but its
# actual VALUES don't matter anymore. AUTH0_DOMAIN/AUTH0_AUDIENCE and
# MONGODB_URI env vars take priority over config.json at runtime (see
# checkJwt.ts / validateEnv.ts), which is how Heroku config vars
# actually deliver real production secrets. Only creates a placeholder
# if one isn't already there, so a local machine with a real
# config.json (from actually running the app) keeps using it.
RUN test -f server/config/config.json || cp server/config/config.example.json server/config/config.json
RUN npm run build --prefix server

ENV NODE_ENV=production

CMD ["node", "server/dist/server.js"]
