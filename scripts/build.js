#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { minify: minifyHtml } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { minify: minifyJs } = require('terser');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = projectRoot;
const distRoot = path.join(projectRoot, 'dist');

const htmlMinifyOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true,
  minifyCSS: true,
  minifyJS: true,
  continueOnParseError: true
};

async function ensureCleanDistDirectory() {
  await fse.remove(distRoot);
  await fse.ensureDir(distRoot);
}

function shouldCopyAsIs(relativeFilePath) {
  // Binary and media assets should be copied without modification
  return /(\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|mp4|mp3|wav|ogg|pdf|woff2?|ttf|eot))$/i.test(relativeFilePath);
}

async function processFile(absoluteFilePath, relativeFilePath) {
  const destinationPath = path.join(distRoot, relativeFilePath);
  await fse.ensureDir(path.dirname(destinationPath));

  if (shouldCopyAsIs(relativeFilePath)) {
    await fse.copy(absoluteFilePath, destinationPath);
    return;
  }

  const fileContent = await fse.readFile(absoluteFilePath, 'utf8');

  if (relativeFilePath.endsWith('.html')) {
    try {
      const minified = await minifyHtml(fileContent, htmlMinifyOptions);
      await fse.writeFile(destinationPath, minified, 'utf8');
    } catch (err) {
      // If minification fails due to malformed HTML, copy original
      await fse.writeFile(destinationPath, fileContent, 'utf8');
    }
    return;
  }

  if (relativeFilePath.endsWith('.css')) {
    const output = new CleanCSS({ level: 2 }).minify(fileContent);
    if (output.errors && output.errors.length) {
      throw new Error(output.errors.join('\n'));
    }
    await fse.writeFile(destinationPath, output.styles, 'utf8');
    return;
  }

  if (relativeFilePath.endsWith('.js')) {
    const result = await minifyJs(fileContent, { toplevel: true });
    if (result.error) {
      throw result.error;
    }
    await fse.writeFile(destinationPath, result.code, 'utf8');
    return;
  }

  // Default: copy as-is
  await fse.copy(absoluteFilePath, destinationPath);
}

async function walkAndProcess(sourceDir, baseRelative = '') {
  const entries = await fse.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'hts-cache') {
      continue;
    }
    const abs = path.join(sourceDir, entry.name);
    const rel = path.join(baseRelative, entry.name);
    if (entry.isDirectory()) {
      await walkAndProcess(abs, rel);
    } else if (entry.isFile()) {
      // Only include root index.html and everything under blog/
      const isRootIndex = rel === 'index.html';
      const isUnderBlog = rel.startsWith('blog' + path.sep);
      // Skip mirrored API/data artifacts to reduce file count for Cloudflare Pages
      const isJson = rel.toLowerCase().endsWith('.json');
      const isMap = rel.toLowerCase().endsWith('.map');
      const isWpJson = rel.includes(`${path.sep}wp-json${path.sep}`) || rel.includes('/wp-json/');
      if ((isRootIndex || isUnderBlog) && !isJson && !isMap && !isWpJson) {
        await processFile(abs, rel);
      }
    }
  }
}

async function main() {
  console.log('Cleaning dist directory...');
  await ensureCleanDistDirectory();
  console.log('Minifying and copying assets...');
  await walkAndProcess(sourceRoot);
  console.log('Build complete. Output in', distRoot);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});


