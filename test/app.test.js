const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createApp } = require('../app');

async function withServer(run) {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function getPage(baseUrl, filter = 'all') {
  const response = await fetch(`${baseUrl}/?filter=${filter}`);
  assert.equal(response.status, 200);
  return response.text();
}

async function postForm(baseUrl, path, fields) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
    redirect: 'manual',
  });
}

test('renders an empty list and adds tasks with validated priorities', async () => {
  await withServer(async (baseUrl) => {
    assert.match(await getPage(baseUrl), /A fresh page\./);

    const emptySubmission = await postForm(baseUrl, '/todos', { title: '   ', priority: 'high' });
    assert.equal(emptySubmission.status, 302);
    assert.equal(emptySubmission.headers.get('location'), '/?error=empty');

    await postForm(baseUrl, '/todos', {
      title: '  <script>alert(1)</script>  ',
      priority: 'high',
    });
    await postForm(baseUrl, '/todos', { title: 'Fallback priority', priority: 'urgent' });

    const page = await getPage(baseUrl);
    assert.match(page, /priority-high">High/);
    assert.match(page, /priority-medium">Medium/);
    assert.match(page, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(page, /<script>alert\(1\)<\/script>/);
  });
});

test('filters, completes, and deletes tasks', async () => {
  await withServer(async (baseUrl) => {
    await postForm(baseUrl, '/todos', { title: 'Write tests', priority: 'low' });
    await postForm(baseUrl, '/todos', { title: 'Ship release', priority: 'high' });

    const page = await getPage(baseUrl);
    const todoIds = [...page.matchAll(/action="\/todos\/([a-f0-9-]+)\/toggle"/g)]
      .map((match) => match[1]);
    assert.equal(todoIds.length, 2);

    const toggleResponse = await postForm(baseUrl, `/todos/${todoIds[0]}/toggle`, {});
    assert.equal(toggleResponse.status, 302);

    const activePage = await getPage(baseUrl, 'active');
    assert.match(activePage, /Write tests/);
    assert.doesNotMatch(activePage, /Ship release/);

    const completedPage = await getPage(baseUrl, 'completed');
    assert.match(completedPage, /Ship release/);
    assert.doesNotMatch(completedPage, /Write tests/);

    const deleteResponse = await postForm(baseUrl, `/todos/${todoIds[0]}/delete`, {});
    assert.equal(deleteResponse.status, 302);
    assert.doesNotMatch(await getPage(baseUrl), /Ship release/);
  });
});