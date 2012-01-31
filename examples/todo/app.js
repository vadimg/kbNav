var application_root = __dirname,
    express = require('express'),
    path = require('path'),
    Mongo = require('mongodb'),
    Seq = require('seq');

var logger = console;

// setup mongodb connection for session information
var server_config = new Mongo.Server('localhost', 27017, { auto_reconnect: true });
var db = new Mongo.Db('kbnav_todo', server_config, {auto_reconnect: true});
db.on('error', function(err) {
    logger.error('mongodb session: ' + err.message);
});

var app = express.createServer();

// true when we are running in production
var production = process.env.NODE_ENV === 'production';
var pubdir = path.join(application_root, 'static');

app.configure('development', function() {
    app.use(express.static(pubdir));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
    // setup javascript minification
    app.use(require('minj').middleware({ src: pubdir}));

    var oneYear = 31557600000;
    app.use(express.staticCache());
    app.use(express.static(pubdir, { maxAge: oneYear }));
    app.use(express.errorHandler());
});


app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.set('views', path.join(application_root, 'views'));
  app.set('view engine', 'html');
  app.register('.html', require('hbs'));
  app.set('view options', {
        layout: false
  });
});

app.error(function(err, req, res) {
    if (err instanceof NotFound) {
        return res.send(404);
    } else {
        logger.error(err.message, err);

        if (!production) {
            return res.send(err.message + '\n' + err.stack);
        }

        // in production, just log log the error and display 500 page
        return res.send(500);
    }
});

app.get('/', function(req, res) {
    var uid = randomString(20);
    Seq()
    .seq(function() {
        db.collection('todos', this);
    })
    .seq(function(collection) {
        collection.insert({
            _id: uid,
            items: {}
        }, {safe: true}, this);
    })
    .seq(function(doc) {
        return res.redirect('/u/' + uid);
    });
});

app.get('/u/:user_id', function(req, res) {
    var user_id = req.param('user_id');
    return res.render('index', {user_id: user_id});
});

function get_user(uid, cb) {
    Seq()
    .seq(function() {
        db.collection('todos', this);
    })
    .seq(function(collection) {
        collection.findOne({_id: uid}, this);
    })
    .seq(function(doc) {
        if(!doc) {
            return cb(null, new NotFound());
        }

        cb(doc);
    });
}

app.get('/api/todos/:user_id', function(req, res, next){
    var user_id = req.param('user_id');
    get_user(user_id, function(doc, err) {
        if(err)
            return next(err);

        // backbone expects an array, not an obj
        var items = [];
        for(var k in doc.items) {
            doc.items[k].id = k;
            items.push(doc.items[k]);
        }

        return res.send(items);
    });
});

app.get('/api/todos/:user_id/:id', function(req, res){
    var user_id = req.param('user_id');
    var id = req.param('id');
    get_user(user_id, function(doc, err) {
        if(err)
            return next(err);

        return res.send(doc.items[id]);
    });
});

// handles creation as well, since ids are created client-side
app.put('/api/todos/:user_id/:id', function(req, res, next){
    var item = {
        text: req.body.text,
        done: req.body.done,
        order: req.body.order
    };

    var uid = req.param('user_id');
    var id = req.param('id');

    Seq()
    .seq(function() {
        db.collection('todos', this);
    })
    .seq(function(collection) {
        var op = {$set: {}};
        op.$set['items.' + id] = item;
        collection.update({_id: uid}, op, {safe:true}, this);
    })
    .seq(function(num) {
        if(!num) {
            return next(new NotFound());
        }

        return res.send(item);
    });
});

app.delete('/api/todos/:user_id/:id', function(req, res){
    var uid = req.param('user_id');
    var id = req.param('id');

    Seq()
    .seq(function() {
        db.collection('todos', this);
    })
    .seq(function(collection) {
        var op = {$unset: {}};
        op.$unset['items.' + id] = 1;
        collection.update({_id: uid}, op, {safe:true}, this);
    })
    .seq(function(num) {
        if(!num) {
            return next(new NotFound());
        }

        return res.send('');
    });
});


// helpers ========================

// testing route to create 500 error
app.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

// testing route to create 404 error
app.get('/404', function(req, res){
    throw new NotFound();
});

// ALWAYS keep as the last route
app.get('*', function(req, res) {
    throw new NotFound();
});

// used to identify 404 pages
function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

function randomString(len) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var ret = '';
    for (var i=0; i<len; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        ret += chars.substring(rnum,rnum+1);
    }
    return ret;
}

app.listen(3000);
