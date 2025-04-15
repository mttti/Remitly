FROM node:18

WORKDIR /app


COPY package*.json .
# COPY . /app #  

RUN npm install

COPY . .

EXPOSE 8080

# ENV NAME=Remitly

CMD ["npm", "start"]
