import { cacheResponse, getCachedResponse, purgeCache, updateCache } from "./caching"
import { CLOUDFLARE_API, EDGE_CACHE } from "./const"
import { getResponseOptions, shouldBypassEdgeCache } from "./util"

const handle = async (event: FetchEvent) => {
  const request = event.request
  let upstreamCache = request.headers.get("x-HTML-Edge-Cache")

  // Only process requests if KV store is set up and there is no
  // HTML edge cache in front of this worker (only the outermost cache
  // should handle HTML caching in case there are varying levels of support).
  let configured = false
  if (typeof EDGE_CACHE !== "undefined") {
    configured = true
  } else if (
    CLOUDFLARE_API.email.length &&
    CLOUDFLARE_API.key.length &&
    CLOUDFLARE_API.zone.length
  ) {
    configured = true
  }

  // Bypass processing of image requests (for everything except Firefox which doesn't use image/*)
  const accept = request.headers.get("Accept")
  let isImage = false
  if (accept && accept.includes("image/*")) {
    isImage = true
  }

  if (configured && !isImage && upstreamCache === null) {
    return processRequest(request, event)
  }

  return await fetch(request)
}

/**
 * Process every request coming through to add the edge-cache header,
 * watch for purge responses and possibly cache HTML GET requests.
 */
const processRequest = async (originalRequest: Request, event: FetchEvent) => {
  let cfCacheStatus: string | null = null
  const accept = originalRequest.headers.get("Accept")
  const isHTML = accept && accept.includes("text/html")
  let { response, cacheVer, status, bypassCache } = await getCachedResponse(originalRequest)

  if (response === null) {
    // Clone the request, add the edge-cache header and send it through.
    const request = new Request(originalRequest)
    request.headers.set("x-HTML-Edge-Cache", "supports=cache|purgeall|bypass-cookies")
    response = await fetch(request)

    if (response) {
      const options = getResponseOptions(response)
      if (options && options.purge) {
        await purgeCache(cacheVer, event)
        status += ", Purged"
      }
      bypassCache = bypassCache || shouldBypassEdgeCache(request, response)
      if (
        (!options || options.cache) &&
        isHTML &&
        originalRequest.method === "GET" &&
        response.status === 200 &&
        !bypassCache
      ) {
        status += await cacheResponse(cacheVer, originalRequest, response, event)
      }
    }
  } else {
    // If the origin didn't send the control header we will send the cached response but update
    // the cached copy asynchronously (stale-while-revalidate). This commonly happens with
    // a server-side disk cache that serves the HTML directly from disk.
    cfCacheStatus = "HIT"
    if (originalRequest.method === "GET" && response.status === 200 && isHTML) {
      bypassCache = bypassCache || shouldBypassEdgeCache(originalRequest, response)
      if (!bypassCache) {
        const options = getResponseOptions(response)
        if (!options) {
          status += ", Refreshed"
          event.waitUntil(updateCache(originalRequest, cacheVer, event))
        }
      }
    }
  }

  if (
    response &&
    status !== null &&
    originalRequest.method === "GET" &&
    response.status === 200 &&
    isHTML
  ) {
    response = new Response(response.body, response)
    response.headers.set("x-HTML-Edge-Cache-Status", status)
    if (cacheVer !== null) {
      response.headers.set("x-HTML-Edge-Cache-Version", cacheVer.toString())
    }
    if (cfCacheStatus) {
      response.headers.set("CF-Cache-Status", cfCacheStatus)
    }
  }

  return response
}

const try_catch_handler = async (event: FetchEvent) => {
  try {
    const response = await handle(event)
    return response
  } catch (err) {
    return new Response(err.stack || err)
  }
}
;((global as unknown) as ServiceWorkerGlobalScope).addEventListener("fetch", event => {
  ;(event as any).passThroughOnException() // CloudFlare specifig
  event.respondWith(try_catch_handler(event))
})
