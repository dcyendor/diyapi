# diyapi

Node API library designed for SBC automation currently under development. This library is created to create HTTP api endpoints 
to perform tasks on the SBC for automation projects. Currently, the api endpoints will allow you to control GPIO pins. Api key
security is implemented and a api key registering process is in progress. 

I am currently developing the project and it is not complete. The end goal is to have a simple way to implement open HTTP api 
endpoints so to compliment a UI application or any way you see fit.

## Getting Started

Ensure your version of Linux is updated
* sudo apt update
* sudo apt upgrade

Note the nodejs version requirements here...

Note the python package requirements here...

Optional packages here...

npm
* Check if npm is currently installed, npm -v
* Install npm, sudo apt install npm

Install forever if you wish to make the service a daemon
* sudo npm install forever -g

## Installation Instructions

* navigate into the folder and execute, sudo npm install. This will install the required packages ensuringthe correct version.

TBD

## API Usage and Documentation

TBD

## DiyAPI Daemon Instructions

The included file diyapi is a framework for creating a service that will work on reboot. Follow these steps:

* Ensure forever is installed
  - sudo npm install forever -g
* Edit the file to the location of the server.js file.
* Copy the file to the /etc/init.d directory
* Enable the service withe the following commands:
   - sudo update-rc.d diyapi defaults
   - sudo update-rc.d diyapi enable

I understand this is not perfect and will work to make it better in the future.



