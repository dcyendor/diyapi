# diyapi
Node API library designed for SBC automation.

I am currently developing the API library. Features currently in progress:

GPIO OFF|ON

Scheduling READ|ADD|DELETE

API Key Security

A method to onboard the API (API Key) to a User Interface
 - Onboarding method that will generate a 4 digit code for authentication.
 - Will deliver the apikey upon successful completition.

Requirements

NodeJS and NPM are required, to check if they are installed:

node -v
npm -v

If they are not installed:

sudo sudo apt-get install nodejs npm

I am currently developing on a Raspberry PI B+ and Raspberry PI Zero W.

I am working on the UI in Android currently.

Installation Instructions

Clone the repository

Install forever
 - sudo npm install forever -g

Execute "setup.sh" 
 - Create some template config files and logging folder.

Execute "node server.js" in the server directory to start the server.

See the diyapi file to create a service.
 - You must edit the path to the server.js file
 - Copy this file to /etc/init.d
 - Enable the service to start with the following commands:
   - sudo update-rc.d diyapi defaults
   - sudo update-rc.d diyapi enable


More details to follow...
