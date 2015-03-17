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
var fs = Promise.promisifyAll(require('fs'));
var fname = process.argv[2];
var mkdirp = Promise.promisifyAll(require('mkdirp'));
console.log('Reading: ', fname);

var H = {};
var users = ['jetienne', 'anto9us'];
var users = fs.readFileSync(fname).toString().split('\n');
console.log(users.length);

function extractDialog(sender, recipient) {
  return knex('messages')
    .whereRaw("(sender='"+recipient+"' AND recipient='"+sender+"') OR (sender='"+sender+"' AND recipient='"+recipient+"')")
    .then(function (messages) {
      return knex('messages')
        .where('sender', 'ubottu')
        .andWhere('id', '>', messages[0].id)
        .andWhere('id', '<', messages[messages.length-1].id).then(function (ubottuMessages) {
          var sortedMessages = messages.concat(ubottuMessages).sort(function (a, b) {
            return a.timestamp < b.timestamp;
          });
          return knex('messages')
            .where('id', '<', messages[0].id)
            .andWhere('sender', recipient)
            .andWhere('recipient', '')
            .orderBy('id', 'desc')
            .limit(1)
            .then(function (startMessage) {
              if (startMessage) {
                messages.unshift(startMessage);
              }
              var length = messages.length;
              H[length] = (H[length] || 0) + 1;
              return mkdirp.mkdirpAsync('dialogs/' + length).then(function () {
                var s = '';
                messages.forEach(function (message) {
                  s += message.timestamp.toISOString() + '\t' + message.sender + '\t' + message.recipient + '\t' + message.message + '\n';
                });
                return fs.writeFileAsync('dialogs/'+length+'/'+H[length]+'.tsv', s).then(function () {
                  return messages.length;
                });
              });
            });
        });
    });
}

function getDialogsForSender(sender, i) {
  return knex('messages')
    .distinct('recipient')
    .where('sender', sender)
    .andWhere('recipient', '<>', '')
    .then(function (results) {
      return Promise.all(results.map(function (result) {
        return extractDialog(sender, result.recipient); 
      }));
    });
}

Promise.map(users, function (sender, i) {
  if (i % 1000 === 0) console.log(i + ": " + sender);
  return getDialogsForSender(sender);
}, { concurrency: 1 }).then(function (dialogs) {
  var merged = [];
  knex.destroy();
  fs.writeFileSync('H_'+fname, JSON.stringify(H));
});
