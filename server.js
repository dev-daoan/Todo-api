var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');

var app = express();
var PORT = process.env.PORT || 3000;
var todos = [];
var todoNextId = 1;

app.use(bodyParser.json());


app.get('/', function(req, res) {
    res.send('Todo API Root');
});

// GET /todo?completed=true
app.get('/todos', function(req, res) {
    var query = req.query;
    var where = {};
    var responeTodo = [];

    if (query.hasOwnProperty('completed') && query.completed === 'true') {
        where.completed = true;
    } else if (query.hasOwnProperty('completed') && query.completed === 'false') {
        where.completed = false;
    }

    if (query.hasOwnProperty('q') && query.q.length > 0) {
        where.description = {
            $like: '%' + query.q + '%'
        };
    }

    db.todo
        .findAll({ where: where })
        .then(function(todos) {
            res.json(todos);
        })
        .catch(function(e) {
            res.status(500).send();
        });

});

app.get('/todos/:id', function(req, res) {
    var todoId = parseInt(req.params.id);

    db.todo.findById(todoId)
        .then(function(todo) {
            if (todo) {
                res.json(todo.toJSON());
            } else {
                res.status(404).send();
            }
        })
        .catch(function(e) {
            res.status(500).send();
        });
});

//POST
app.post('/todos', function(req, res) {
    var body = _.pick(req.body, 'description', 'completed');

    db.todo.create(body)
        .then(function(todo) {
            res.json(todo.toJSON());
        })
        .catch(function(e) {
            res.status(400).json(e);
        });

});

//DELETE /todos/:id
app.delete('/todos/:id', function(req, res) {
    var todoId = parseInt(req.params.id);
    var where = {
        id: todoId
    };
    db.todo
        .destroy({ where: where })
        .then(function(rowDeleted) {
            if (rowDeleted === 0) {
                res.status(400).json({ "error": "no todo found with that id" });
            } else {
                res.status(204).send();
            }
        })
        .catch(function(e) {
            res.status(500).send();
        });

});

//PUT /todos/:id
app.put('/todos/:id', function(req, res) {
    var todoId = parseInt(req.params.id);
    var body = _.pick(req.body, 'description', 'completed');
    var attributes = {};

    if (body.hasOwnProperty('completed')) {
        attributes.completed = body.completed;
    }

    if (body.hasOwnProperty('description')) {
        attributes.description = body.description;
    }

    db.todo.findById(todoId)
        .then(function(todo) {
            if (todo) {
                return todo.update(attributes);
            } else {
                res.status(404).send();
            }
        })
        .then(function(todo) {
            res.json(todo.toJSON());
        })
        .catch(function(e) {
            res.status(500).send();
        });
});

app.post('/users', function(req, res) {
    var body = _.pick(req.body, 'email', 'password');

    db.users.create(body)
        .then(function(user) {
            res.json(user.toPublicJSON());
        })
        .catch(function(e) {
            res.status(400).json(e);
        });
});

//POST /users/login
app.post('/users/login', function(req, res) {
    var body = _.pick(req.body, 'email', 'password');

    db.users.authenticate(body)
        .then(function(user) {
            var token = user.generateToken('authentication');
            if (token) {
                return res.header('Auth', token).json(user.toPublicJSON());
            } else {
                res.status(401).send();
            }
        })
        .catch(function() {
            res.status(401).send();
        });

});

db.sequelize.sync({ force: true }).then(function() {
    app.listen(PORT, function() {
        console.log('Express listening on port ' + PORT + '!');
    });
});
