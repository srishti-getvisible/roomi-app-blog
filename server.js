const express = require('express');
const path = require('path');
const serveStatic = require('serve-static');

const app = express();
const PORT = process.env.PORT || 8000;

// Serve static files from the blog directory under /blog path
app.use('/blog', serveStatic(path.join(__dirname, '/blog'), {
  index: ['index.html', 'index.htm'],
  setHeaders: (res, filePath) => {
    // Set proper MIME type for .js files
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Redirect root to /blog
app.get('/', (req, res) => {
  res.redirect('/blog');
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '/blog/404.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/blog`);
  console.log(`Serving files from: ${path.join(__dirname, 'blog')}`);
});
