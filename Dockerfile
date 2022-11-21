FROM node:16 As development
WORKDIR /usr/src/app
COPY package*.json ./
COPY *.lock ./
RUN yarn install
COPY . .
RUN yarn run build

RUN apt-get update -y \
    && apt-get install python3-pip -y \
    && pip3 install pyxform==1.10.1

CMD ["node", "dist/main"]