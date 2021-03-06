Blockchain Explorer

See:
http://139.162.99.4:9000/

Requirements:
- Cassandra (cluster needs to be installed with CCM).
It can be installed with [homebrew](http://brew.sh/).

How to run the app:
- Install dependencies (from the app directory):
```
npm install
```

- Create Cassandra cluster as described [here](https://github.com/pcmanus/ccm).

- Run the cluster:
```
ccm start
```

- Install nodemon and webpack global modules:
```
npm install -g nodemon
npm install -g webpack
```

- Run the server and webpack:
```
nodemon
webpack --watch
```

Block structure:
Refer to cassandra-ddl.cql to create schema
