// Strip /blog from URLs and transparently serve content from the /blog directory
// - Redirect:  /blog/*  →  /*   (301)
// - Rewrite:   /*        →  serve /blog/* content without changing the URL

export async function onRequest(context) {
	const { request, next } = context;
	const url = new URL(request.url);

	// Normalize path with leading slash
	const path = url.pathname;

	// 1) If user hits /blog/*, redirect to the same path without /blog
	if (path === "/blog" || path.startsWith("/blog/")) {
		const stripped = path.replace(/^\/blog\/?/, "/");
		const location = stripped + url.search;
		return Response.redirect(location, 301);
	}

	// 2) For any other URL, internally rewrite to /blog/* so assets resolve from that subfolder
	const rewritten = new URL(url.origin + "/blog" + (path === "/" ? "/" : path) + url.search);
	const rewrittenRequest = new Request(rewritten.toString(), request);

	// Pass the rewritten request to the static asset handler
	return next(rewrittenRequest);
}


