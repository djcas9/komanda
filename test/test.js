var irc = require('irc');

console.log('hello?');

var bot = new irc.Client('snorby.org', 'mephux', {
  port: 6667,
  userName: "mephux",
  sasl: true,
  pass: "start0492",
  password: "start0492",
  debug: true,
  selfSigned: true,
  certExpired: true,
  showErrors: true,
  secure: true,
});

bot.addListener('error', function(message) {
    console.error('ERROR: %s: %s', message.command, message.args.join(' '));
});

bot.addListener('message#test', function (from, message) {
    console.log('<%s> %s', from, message);
});

bot.addListener('message', function (from, to, message) {
    console.log('%s => %s: %s', from, to, message);
});
bot.addListener('pm', function(nick, message) {
    console.log('Got private message from %s: %s', nick, message);
});
bot.addListener('join', function(channel, who) {
    console.log('%s has joined %s', who, channel);
});
bot.addListener('part', function(channel, who, reason) {
    console.log('%s has left %s: %s', who, channel, reason);
});
bot.addListener('kick', function(channel, who, by, reason) {
    console.log('%s was kicked from %s by %s: %s', who, channel, by, reason);
});
