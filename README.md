#### Description
This repository contains the source code to extract the dialogs used in the following paper:

*The Ubuntu Dialogue Corpus: A Large Dataset for Research in Unstructured Multi-Turn Dialogue Systems [arXiv:1506.08909](http://arxiv.org/abs/1506.08909).*

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
# node extractDialogs.js nicks.txt
```
