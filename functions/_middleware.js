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

	// 2) For no-slash, fetch the slash version directly from static assets to avoid middleware recursion
	const slashUrl = new URL(request.url);
	slashUrl.pathname = pathname + "/";

	const assetRequest = new Request(slashUrl.toString(), request);
	const assetResp = await context.env.ASSETS.fetch(assetRequest);

	if (assetResp && assetResp.ok) {
		const headers = new Headers(assetResp.headers);
		return new Response(assetResp.body, { status: assetResp.status, headers });
	}

	return next();
}


