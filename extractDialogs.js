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

var VISITED = {};
var H = {};
var users = ['jetienne', 'anto9us'];
var users = fs.readFileSync(fname).toString().split('\n');
console.log(users.length);

function extractDialog(sender, recipient) {
  var key = [sender, recipient].sort().join('@');
  if (VISITED[key]) return Promise.resolve();
  VISITED[key] = true;
  return knex('messages')
    .whereRaw("(sender='"+recipient+"' AND recipient='"+sender+"') OR (sender='"+sender+"' AND recipient='"+recipient+"')")
    .orderBy('timestamp')
    .then(function (messages) {
      return knex('messages')
        .where('timestamp', '<=', messages[0].timestamp)
        .andWhere('sender', messages[0].recipient)
        .andWhere('recipient', '')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .then(function (startMessages) {
          for (var i = 0, l = startMessages.length; i < l; ++i) {
            if (i === 0 || (startMessages[0].timestamp - startMessages[i].timestamp) < 180000) {
              messages.unshift(startMessages[i]);
            } else {
              break;
            }
          }
          var length = messages.length;
          var id = H[length] = (H[length] || 0) + 1;
          return mkdirp.mkdirpAsync('dialogs/' + length).then((function (id) {
            var s = '';
            messages.forEach(function (message) {
              s += message.timestamp.toISOString() + '\t' + message.sender + '\t' + message.recipient + '\t' + message.message + '\n';
            });
            return fs.writeFileAsync('dialogs/'+length+'/'+id+'.tsv', s).then(function () {
              return messages.length;
            });
          })(id));
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
}, { concurrency: 4 }).then(function (dialogs) {
  var merged = [];
  knex.destroy();
  fs.writeFileSync('H_'+fname, JSON.stringify(H));
});
