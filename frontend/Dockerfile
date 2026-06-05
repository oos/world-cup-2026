FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG VITE_ENABLE_ADS=false
ARG VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
ENV VITE_ENABLE_ADS=$VITE_ENABLE_ADS
ENV VITE_ADSENSE_CLIENT_ID=$VITE_ADSENSE_CLIENT_ID
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
