# Use the official Node.js 16 image as a parent image
FROM node:16

# Install system dependencies
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    apt-get install -y wget

# Add Ethereum PPA repository and install solc
RUN echo "deb http://ppa.launchpad.net/ethereum/ethereum/ubuntu bionic main" > /etc/apt/sources.list.d/ethereum.list && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 2A518C819BE37D2C2031944D1C52189C923F6CA9 && \
    apt-get update && \
    apt-get install -y solc

# Install other necessary packages
RUN apt-get install -y libssl-dev python3-dev python3-pip

# Install Mythril
RUN pip3 install mythril

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the entire app
COPY . .

EXPOSE 3001

CMD [ "node", "server.js" ]
