##### Dependencies
* Postgresql
* Enchant
* PyPy (pyenchant, psycopg2)
* NodeJS (bluebird, knex, mkdirp)

##### Create database
```
psql -d template1
> create database ubuntu;
```

##### Process corpus (~5min)
```
# ln -s /path/to/ubuntu/corpus data
# node createTable.js
# pypy main.py
```
This produces a file `ubuntu.sql`

##### Load corpus into postgres (~5min)
```
# psql -d ubuntu
> copy messages from '/tmp/ubuntu.sql';
```

##### Add indexes (~20min)
```
# node createTable.js index
```

##### Extract dialogs (~8hrs)
```
# node extractDialogs.js
```
