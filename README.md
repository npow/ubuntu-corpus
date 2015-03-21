##### Dependencies
* Postgresql
* Enchant
* PyPy (pyenchant, psycopg2)
* NodeJS (bluebird, knex, mkdirp)

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
> copy messages from '/path/to/ubuntu.sql';
```

##### Add indexes (~20min)
```
# node createTable.js index
```
