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
var BLACKLIST = ['ubotu', 'ubottu', 'ubot3`', 'ubot3' ];
var H = {};
var users = ['jetienne', 'anto9us'];
var users = fs.readFileSync(fname).toString().split('\n').filter(function (x) { return x.length > 0; });
console.log('Num users: ' + users.length);

function writeMessages(allMessages, id, length) {
  if (length < 3) return length;
  var s = '';
  allMessages.forEach(function (message) {
    s += message.timestamp.toISOString() + '\t' + message.sender + '\t' + message.recipient + '\t' + message.message + '\n';
  });
  return fs.writeFileAsync('dialogs/'+length+'/'+id+'.tsv', s).then(function () {
    return length;
  });
}

function dumpDialog(startMessages, allMessages) {
  for (var i = 0, l = startMessages.length; i < l; ++i) {
    if (allMessages[0].timestamp - startMessages[i].timestamp < 180000) {
      allMessages.unshift(startMessages[i]);
    } else {
      break;
    }
  }
  var length = allMessages.length;
  var id = H[length] = (H[length] || 0) + 1;
  if (fs.existsSync('dialogs/' + length)) {
      return writeMessages(allMessages, id, length);
  } else {
    return mkdirp.mkdirpAsync('dialogs/' + length).then(function () {
      return writeMessages(allMessages, id, length);
    });
  }
}

function extractDialog(sender, recipient) {
  var key = [sender, recipient].sort().join('@');
  if (BLACKLIST.indexOf(sender) > -1 || BLACKLIST.indexOf(recipient) > -1 || VISITED[key]) return Promise.resolve();
  VISITED[key] = true;
  return knex('messages')
    .whereRaw("(sender='"+recipient+"' AND recipient='"+sender+"') OR (sender='"+sender+"' AND recipient='"+recipient+"')")
    .then(function (messages) {
      return knex('messages')
        .where('id', '<', messages[0].id)
        .andWhere('sender', messages[0].recipient)
        .andWhere('recipient', '')
        .orderBy('id', 'desc')
        .limit(10)
        .then(function (startMessages) {
          return knex('messages')
            .whereRaw("(sender='"+recipient+"' OR sender='"+sender+"')")
            .andWhere('id', '>=', messages[0].id)
            .andWhere('id', '<=', messages[messages.length-1].id)
            .then(function (allMessages) {
              var recipientsA = {};
              var recipientsB = {};
              allMessages.forEach(function (x) {
                if (x.sender === sender && x.recipient !== '') {
                  recipientsA[x.recipient] = 1;
                } else if (x.sender === recipient && x.recipient !== '') {
                  recipientsB[x.recipient] = 1;
                }
              });
              var lenA = Object.keys(recipientsA).length;
              var lenB = Object.keys(recipientsB).length;
              if (lenA === lenB && lenA === 1) {
                return dumpDialog(startMessages, allMessages);
              }
              return dumpDialog(startMessages, messages);
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
}, { concurrency: 4 }).then(function (dialogs) {
  var merged = [];
  knex.destroy();
});
