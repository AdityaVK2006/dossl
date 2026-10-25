const express = require('express');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

const app = express();
const port = process.env.PORT || 3000;
const todos = [];
const filters = new Set(['all', 'active', 'completed']);
const priorities = new Set(['low', 'medium', 'high']);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const filter = filters.has(req.query.filter) ? req.query.filter : 'all';
  const visibleTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  res.render('index', {
    todos: visibleTodos,
    filter,
    counts: {
      all: todos.length,
      active: todos.filter((todo) => !todo.completed).length,
      completed: todos.filter((todo) => todo.completed).length,
    },
    error: req.query.error === 'empty' ? 'Add a task before submitting.' : null,
  });
});

app.post('/todos', (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const priority = priorities.has(req.body.priority) ? req.body.priority : 'medium';

  if (!title) return res.redirect('/?error=empty');

  todos.unshift({ id: randomUUID(), title: title.slice(0, 120), priority, completed: false });
  res.redirect('/');
});

app.post('/todos/:id/toggle', (req, res) => {
  const todo = todos.find((item) => item.id === req.params.id);
  if (todo) todo.completed = !todo.completed;
  res.redirect('/');
});

app.post('/todos/:id/delete', (req, res) => {
  const index = todos.findIndex((item) => item.id === req.params.id);
  if (index !== -1) todos.splice(index, 1);
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Daymark is running at http://localhost:${port}`);
});