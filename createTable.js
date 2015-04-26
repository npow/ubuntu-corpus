var knex = require('knex')({
  client: 'postgresql', 
  connection: { 
    host : 'localhost', 
    port : 5432,
    database : 'ubuntu',
    charset : 'utf8' 
  }
});
var Promise = require('bluebird');
var createIndexes = process.argv.length > 1 && process.argv[2] === "index";

function createIndex(column) {
  return knex.schema.table('messages', function (table) {
    table.index(column);
  });
}

if (createIndexes) {
  Promise.all([['sender', 'recipient'], 'recipient', 'timestamp', 'id'].map(function (column) {
    return createIndex(column);
  })).then(function () {
    knex.destroy();
  });
} else {
  knex.schema.createTable('messages', function (table) {
    table.increments('id')
    table.datetime('timestamp');
    table.string('sender');
    table.string('recipient');
    table.text('message');
    table.integer('dialog_id');
  }).then(function () {
    return knex.schema.createTable('dialogs', function (table) {
      table.increments('id')
    });
  }).then(function () {
    knex.destroy();
  });
}
