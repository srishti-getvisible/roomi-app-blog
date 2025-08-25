#!/usr/bin/env python3
import http.server
import os
import posixpath
import re
import sys
import urllib.parse
from functools import lru_cache
from typing import Dict, Optional, Tuple

WORKSPACE_DIR = os.path.abspath(os.path.dirname(__file__))
BLOG_ROOT = os.path.join(WORKSPACE_DIR, "blog")


def build_slug_to_path_map() -> Dict[str, str]:
	"""Scan the blog tree for index.html files and map slug -> absolute path.

	Slug is the immediate parent directory name of an index.html.
	If duplicates exist, the first encountered wins.
	"""
	slug_to_path: Dict[str, str] = {}
	for current_dir, _subdirs, files in os.walk(BLOG_ROOT):
		if "index.html" in files:
			parent_dir_name = os.path.basename(current_dir.rstrip(os.sep))
			abs_index_path = os.path.join(current_dir, "index.html")
			if parent_dir_name not in slug_to_path:
				slug_to_path[parent_dir_name] = abs_index_path
			else:
				print(f"[warn] Duplicate slug '{parent_dir_name}' -> {abs_index_path} (already mapped to {slug_to_path[parent_dir_name]})")
	return slug_to_path


SLUG_MAP = build_slug_to_path_map()
print(f"[info] Loaded {len(SLUG_MAP)} blog slugs")


SECTION_PREFIXES = (
	"us",
	"mexico",
	"latam",
	"uncategorized",
	"tag",
	"author",
	"page",
	"our-founder",
	"press",
)

ASSET_PREFIXES = (
	"wp-content",
	"cdn-cgi",
	"wp-json",
	"comments",
	"feed",
)

STATIC_PAGES = ("faq", "about", "press")


class BlogRequestHandler(http.server.SimpleHTTPRequestHandler):
	def translate_path(self, path: str) -> str:
		path = posixpath.normpath(urllib.parse.unquote(path))
		words = path.lstrip('/').split('/') if path else []
		resolved = WORKSPACE_DIR
		for word in words:
			if not word:
				continue
			if os.path.dirname(word) or os.path.basename(word) != word:
				continue
			resolved = os.path.join(resolved, word)
		return resolved

	def log_message(self, format: str, *args) -> None:
		sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

	def do_HEAD(self) -> None:
		self._is_head = True
		try:
			self.do_GET()
		finally:
			self._is_head = False

	def do_GET(self) -> None:
		parsed = urllib.parse.urlparse(self.path)
		clean_path = parsed.path

		# 0) Map root asset requests (e.g., /wp-content/*) to blog assets
		for prefix in ASSET_PREFIXES:
			if clean_path == f"/{prefix}" or clean_path.startswith(f"/{prefix}/"):
				mapped = os.path.join(BLOG_ROOT, clean_path.lstrip('/'))
				if os.path.isdir(mapped):
					candidate = os.path.join(mapped, "index.html")
					if os.path.isfile(candidate):
						return self._serve_absolute(candidate)
				if os.path.isfile(mapped):
					return self._serve_absolute(mapped)
				break

		# Redirect mirrored host root to /blog (e.g., /blog2.roomiapp.com[/index.html])
		if clean_path == "/blog2.roomiapp.com" or clean_path == "/blog2.roomiapp.com/" or clean_path == "/blog2.roomiapp.com/index.html":
			return self._redirect_permanent("/blog")

		# Root-level numeric paths should behave like /blog/<n>
		m_root_num_idx = re.fullmatch(r"/([0-9]+)/index\.html", clean_path)
		if m_root_num_idx:
			page = m_root_num_idx.group(1)
			return self._redirect_permanent("/blog" if page == "1" else f"/blog/{page}")
		m_root_num_dir = re.fullmatch(r"/([0-9]+)/?", clean_path)
		if m_root_num_dir:
			page = m_root_num_dir.group(1)
			return self._redirect_permanent("/blog" if page == "1" else f"/blog/{page}")

		# 0b) Static pages: /faq, /about, /press -> serve blog/<page>/index.html
		for page in STATIC_PAGES:
			if clean_path == f"/{page}":
				candidate = os.path.join(BLOG_ROOT, page, "index.html")
				if os.path.isfile(candidate):
					return self._serve_absolute(candidate)
				return self._send_404()
			if clean_path == f"/{page}/index.html" or clean_path == f"/{page}/":
				return self._redirect_permanent(f"/{page}")

		# 1) Main blog page: /blog -> serve blog/index.html
		if clean_path == "/blog":
			return self._serve_absolute(os.path.join(BLOG_ROOT, "index.html"))

		# 1b) Pagination: /blog/<n> -> serve blog/page/<n>/index.html (n=1 -> /blog)
		m_page = re.fullmatch(r"/blog/([0-9]+)", clean_path)
		if m_page:
			page_num = m_page.group(1)
			if page_num == "1":
				return self._redirect_permanent("/blog")
			abs_index = os.path.join(BLOG_ROOT, "page", page_num, "index.html")
			if os.path.isfile(abs_index):
				return self._serve_absolute(abs_index)
			return self._send_404()

		# 1c) Redirect /blog/page/<n>[/index.html] -> /blog or /blog/<n>
		m_page_old_idx = re.fullmatch(r"/blog/page/([0-9]+)/index\.html", clean_path)
		if m_page_old_idx:
			pg = m_page_old_idx.group(1)
			return self._redirect_permanent("/blog" if pg == "1" else f"/blog/{pg}")
		m_page_old_dir = re.fullmatch(r"/blog/page/([0-9]+)/?", clean_path)
		if m_page_old_dir:
			pg = m_page_old_dir.group(1)
			return self._redirect_permanent("/blog" if pg == "1" else f"/blog/{pg}")

		# Also redirect legacy /page/<n> under root to /blog/<n> (or /blog for 1)
		m_legacy_root_page_idx = re.fullmatch(r"/page/([0-9]+)/index\.html", clean_path)
		if m_legacy_root_page_idx:
			pg = m_legacy_root_page_idx.group(1)
			return self._redirect_permanent("/blog" if pg == "1" else f"/blog/{pg}")
		m_legacy_root_page_dir = re.fullmatch(r"/page/([0-9]+)/?", clean_path)
		if m_legacy_root_page_dir:
			pg = m_legacy_root_page_dir.group(1)
			return self._redirect_permanent("/blog" if pg == "1" else f"/blog/{pg}")

		# 2) Flat blog URL: /blog/<slug>
		m_flat = re.fullmatch(r"/blog/([^/]+)", clean_path)
		if m_flat:
			slug = m_flat.group(1)
			abs_index = SLUG_MAP.get(slug)
			if abs_index and os.path.isfile(abs_index):
				return self._serve_absolute(abs_index)
			return self._send_404()

		# 3) Redirect /blog/(.../)?<slug>/index.html -> /blog/<slug>
		m_deep_idx = re.fullmatch(r"/blog/(?:.*/)?([^/]+)/index\.html", clean_path)
		if m_deep_idx:
			slug = m_deep_idx.group(1)
			return self._redirect_permanent(f"/blog/{slug}")

		# 4) Redirect /blog/(.../)?<slug>/ -> /blog/<slug> when the slug exists
		m_deep_dir = re.fullmatch(r"/blog/(?:.*/)?([^/]+)/", clean_path)
		if m_deep_dir:
			slug = m_deep_dir.group(1)
			candidate = SLUG_MAP.get(slug)
			if candidate and os.path.isfile(candidate):
				return self._redirect_permanent(f"/blog/{slug}")

		# 5) Non-/blog deep paths like /section/.../slug/index.html -> redirect
		m_non_blog_idx = re.fullmatch(r"/(?:" + "|".join(map(re.escape, SECTION_PREFIXES)) + r")/.*/([^/]+)/index\.html", clean_path)
		if m_non_blog_idx:
			slug = m_non_blog_idx.group(1)
			return self._redirect_permanent(f"/blog/{slug}")

		# 6) Non-/blog deep paths ending with / -> redirect if slug exists
		m_non_blog_dir = re.fullmatch(r"/(?:" + "|".join(map(re.escape, SECTION_PREFIXES)) + r")/.*/([^/]+)/", clean_path)
		if m_non_blog_dir:
			slug = m_non_blog_dir.group(1)
			candidate = SLUG_MAP.get(slug)
			if candidate and os.path.isfile(candidate):
				return self._redirect_permanent(f"/blog/{slug}")

		# 7) Generic catch-all for any deep path ending in /index.html (outside /blog)
		if clean_path.startswith("/blog/") is False:
			m_any_idx = re.fullmatch(r"/.*/([^/]+)/index\.html", clean_path)
			if m_any_idx:
				slug = m_any_idx.group(1)
				return self._redirect_permanent(f"/blog/{slug}")
			m_any_dir = re.fullmatch(r"/.*/([^/]+)/", clean_path)
			if m_any_dir:
				slug = m_any_dir.group(1)
				candidate = SLUG_MAP.get(slug)
				if candidate and os.path.isfile(candidate):
					return self._redirect_permanent(f"/blog/{slug}")

		# 8) Favicon fallthrough: try blog/favicon.ico if root missing
		if clean_path == "/favicon.ico":
			fav = os.path.join(BLOG_ROOT, "favicon.ico")
			if os.path.isfile(fav):
				return self._serve_absolute(fav)

		# 9) Anything else: fall back to default static file handling
		return super().do_GET()

	def _serve_absolute(self, absolute_path: str) -> None:
		if not os.path.isfile(absolute_path):
			return self._send_404()
		try:
			content_type = self.guess_type(absolute_path)
			fs = os.stat(absolute_path)
			self.send_response(200)
			self.send_header("Content-type", content_type)
			self.send_header("Content-Length", str(fs.st_size))
			self.end_headers()
			if getattr(self, "_is_head", False):
				return
			with open(absolute_path, "rb") as f:
				self.copyfile(f, self.wfile)
		except BrokenPipeError:
			pass

	def _redirect_permanent(self, location_path: str) -> None:
		parsed = urllib.parse.urlparse(self.path)
		qs = f"?{parsed.query}" if parsed.query else ""
		location = location_path + qs
		self.send_response(301)
		self.send_header("Location", location)
		self.end_headers()

	def _send_404(self) -> None:
		self.send_error(404, "File not found")


def run(port: int) -> None:
	os.chdir(WORKSPACE_DIR)
	server_address = ("127.0.0.1", port)
	httpd = http.server.ThreadingHTTPServer(server_address, BlogRequestHandler)
	print(f"[info] Serving at http://{server_address[0]}:{server_address[1]}")
	try:
		httpd.serve_forever()
	except KeyboardInterrupt:
		pass
	finally:
		httpd.server_close()


if __name__ == "__main__":
	port = 8001
	if len(sys.argv) > 1:
		try:
			port = int(sys.argv[1])
		except ValueError:
			pass
	run(port)
