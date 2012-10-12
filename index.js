var spawn = require('child_process').spawn;
var Seq = require('seq');
var EventEmitter = require('events').EventEmitter;

module.exports = function(opts) {
  if (!opts.repos || !opts.static) {
    throw new Error('opts.{repos,static} required');
  }
  return new LayOut(opts);
};

function LayOut(opts) {
  EventEmitter.call(this);
  this.repos = opts.repos;
  this.static = opts.static;
}

LayOut.prototype = new EventEmitter;

LayOut.prototype.lay = function(push) {
  var self = this;
  var repo = push.repo;
  var repoClean = repo.split('.git')[0];
  var rev = push.branch || push.version;
  var repos = self.repos;

  var dest = self.static + '/' + repo.Clean + '/' + rev;

  push.on('accept', function() {
    push.on('exit', function() {
      Seq()
        .seq(function() {
          var ps = spawn('git', ['clone', repos + '/' + repo, dest]);
          ps.stderr.pipe(process.stderr, { end : false });
          ps.on('exit', this.ok);
        })
        .seq(function() {
          self.emit('laid', repoClean, rev);
          if (rev == 'master') return;
          var ps = spawn('git', ['checkout', rev], { cwd : dest });
        })
      ;
    });
  });
}

LayOut.prototype.handle = function() {
  var pushover = require('pushover');
  var repos = pushover(this.repos);
  var self = this;

  repos.on('push', function(push) {
    self.lay(push);
    push.accept();
  });
  repos.on('tag', function(tag) {
    self.lay(tag);
    tag.accept();
  });

  return repos.handle.bind(repos);
}
