eve-galaxy-test
===============

Demo of extracting and normalizing solarsystem data from SDD then rendering with three.js

Requires mysql, nodejs, npm
Modify mysql user/pass/database name in app.js if necessary.

Clone git repo:

    $ git clone https://github.com/therealplato/eve-galaxy-test.git

Install dependencies:
    
    $ cd eve-galaxy-test; npm install

Copy solarsystem data from SDD export into a mysql database: 

    mysql> create database test
    $ bzcat mapSolarSystems.sql.bz2|mysql test

Run node server:

    node app.js

Open galaxy.html in a web browser, it will make an ajax request to
localhost:3210 that will be served by the node script. The response will be a
json file containing all solarsystems in EVE. This will be rendered by three.js
