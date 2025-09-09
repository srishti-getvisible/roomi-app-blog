const express = require('express');
const path = require('path');
const serveStatic = require('serve-static');

const app = express();
const PORT = process.env.PORT || 8000;

// Determine roots for serving content
const isProduction = process.env.NODE_ENV === 'production';
const projectRoot = __dirname;
// Serve static files from the blog directory under /blog path
// In production, serve from dist/blog if it exists
const blogDir = path.join(projectRoot, isProduction ? 'dist/blog' : 'blog');
app.use('/blog', serveStatic(blogDir, {
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
  const notFoundPath = path.join(blogDir, '404.html');
  res.status(404).sendFile(notFoundPath);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/blog`);
  console.log(`Serving /blog from: ${blogDir}`);
});
