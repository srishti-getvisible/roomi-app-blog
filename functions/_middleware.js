export async function onRequest(context) {
	const { request, next } = context;
	const url = new URL(request.url);
	const pathname = url.pathname;

	// Only handle /blog/* paths
	if (!pathname.startsWith("/blog/")) return next();

	// 1) If it ends with a slash, 301 to no-trailing-slash
	if (pathname.length > 1 && pathname.endsWith("/")) {
		url.pathname = pathname.slice(0, -1);
		return Response.redirect(url.toString(), 301);
	}

	// 2) For no-slash, fetch the slash version internally and stream it back
	const slashUrl = new URL(request.url);
	slashUrl.pathname = pathname + "/";

	const resp = await fetch(slashUrl.toString(), {
		headers: { "User-Agent": "Mozilla/5.0 (Cloudflare Pages Function)" },
		redirect: "manual",
	});

	if (resp.ok) {
		const headers = new Headers(resp.headers);
		return new Response(resp.body, { status: resp.status, headers });
	}

	return next();
}


