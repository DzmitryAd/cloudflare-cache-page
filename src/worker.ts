import { kvEnvStore } from "./worker-env-store"
import { TCloudflareAPI, TKvStoreEnv } from "./types"

// IMPORTANT: Either A Key/Value Namespace must be bound to this worker script
// using the variable name EDGE_CACHE. or the API parameters below should be
// configured. KV is recommended if possible since it can purge just the HTML
// instead of the full cache.

// API settings if KV isn't being used
const CF_EMAIL = "" // From https://dash.cloudflare.com/profile
const CF_KEY = "" // Global API Key from https://dash.cloudflare.com/profile
const CF_ZONE = "" // "Zone ID" from the API section of the dashboard overview page https://dash.cloudflare.com/

const CLOUDFLARE_API: TCloudflareAPI = { CF_EMAIL, CF_KEY, CF_ZONE }
const DEFAULT_BYPASS_COOKIES = ["wp-", "wordpress", "comment_", "woocommerce_"]
const CACHE_HEADERS = ["Cache-Control", "Expires", "Pragma"]
;((global as unknown) as ServiceWorkerGlobalScope).addEventListener("fetch", event => {
  ;(event as any).passThroughOnException() // CloudFlare specifig
  event.respondWith(try_catch_handler(event))
})

const try_catch_handler = async (event: FetchEvent) => {
  try {
    const response = await handle(event)
    return response
  } catch (err) {
    return new Response(err.stack || err)
  }
}

const handle = async (event: FetchEvent) => {
  const request = event.request
  let upstreamCache = request.headers.get("x-HTML-Edge-Cache")
  const env: TKvStoreEnv = await kvEnvStore.getEnv()

  // Only process requests if KV store is set up and there is no
  // HTML edge cache in front of this worker (only the outermost cache
  // should handle HTML caching in case there are varying levels of support).
  let configured = false
  if (env) {
    configured = true
  } else if (
    CLOUDFLARE_API.CF_EMAIL.length &&
    CLOUDFLARE_API.CF_KEY.length &&
    CLOUDFLARE_API.CF_ZONE.length
  ) {
    configured = true
  }

  // Bypass processing of image requests (for everything except Firefox which doesn't use image/*)
  const accept = request.headers.get("Accept")
  let isImage = false
  if (accept && accept.indexOf("image/*") !== -1) {
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
  let cfCacheStatus = null
  const accept = originalRequest.headers.get("Accept")
  const isHTML = accept && accept.indexOf("text/html") >= 0
  let { response, cacheVer, status, bypassCache } = await getCachedResponse(originalRequest)

  if (response === null) {
    // Clone the request, add the edge-cache header and send it through.
    let request = new Request(originalRequest)
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

const getCachedResponse = async (request: Request) => {
  let response = null
  let cacheVer = null
  let bypassCache = false
  let status = "Miss"

  // Only check for HTML GET requests (saves on reading from KV unnecessarily)
  // and not when there are cache-control headers on the request (refresh)
  const accept = request.headers.get("Accept")
  const cacheControl = request.headers.get("Cache-Control")
  let noCache = false
  if (cacheControl && cacheControl.indexOf("no-cache") !== -1) {
    noCache = true
    status = "Bypass for Reload"
  }
  if (!noCache && request.method === "GET" && accept && accept.indexOf("text/html") >= 0) {
    // Build the versioned URL for checking the cache
    cacheVer = await GetCurrentCacheVersion(cacheVer)
    const cacheKeyRequest = GenerateCacheRequest(request, cacheVer)

    // See if there is a request match in the cache
    try {
      let cache = caches.default
      let cachedResponse = await cache.match(cacheKeyRequest)
      if (cachedResponse) {
        // Copy Response object so that we can edit headers.
        cachedResponse = new Response(cachedResponse.body, cachedResponse)

        // Check to see if the response needs to be bypassed because of a cookie
        bypassCache = shouldBypassEdgeCache(request, cachedResponse)

        // Copy the original cache headers back and clean up any control headers
        if (bypassCache) {
          status = "Bypass Cookie"
        } else {
          status = "Hit"
          cachedResponse.headers.delete("Cache-Control")
          cachedResponse.headers.delete("x-HTML-Edge-Cache-Status")
          for (header of CACHE_HEADERS) {
            let value = cachedResponse.headers.get("x-HTML-Edge-Cache-Header-" + header)
            if (value) {
              cachedResponse.headers.delete("x-HTML-Edge-Cache-Header-" + header)
              cachedResponse.headers.set(header, value)
            }
          }
          response = cachedResponse
        }
      } else {
        status = "Miss"
      }
    } catch (err) {
      // Send the exception back in the response header for debugging
      status = "Cache Read Exception: " + err.message
    }
  }

  return { response, cacheVer, status, bypassCache }
}
