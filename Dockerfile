FROM node:12.14

RUN mkdir /app
WORKDIR /app

ADD package*.json /app/
RUN npm install

ADD . /app/
CMD [ "npm", "run", "start" ]