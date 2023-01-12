FROM node:16 AS builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package.json ./
COPY yarn.lock ./

# Install app dependencies
RUN yarn install
COPY . .
RUN yarn run build
COPY dist ./dist

FROM node:16

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/dist ./dist

# create gen directories to store files
RUN mkdir -p ./gen/images ./gen/xlsx ./gen/xml ./gen/zip/extracted ./gen/zip/uploaded

RUN apt-get update -y \
    && apt-get install python3-pip -y \
    && pip3 install pyxform==1.10.1

EXPOSE 3000
CMD [ "yarn", "run", "start:prod" ]