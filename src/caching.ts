import { CACHE_HEADERS, CACHE_VERSION, CLOUDFLARE_API, EDGE_CACHE } from "./const"
import { TCachedResponse } from "./types"
import {
  generateCacheRequest,
  getCurrentCacheVersion,
  getResponseOptions,
  shouldBypassEdgeCache,
} from "./util"

export const getCachedResponse = async (request: Request): Promise<TCachedResponse> => {
  let response = null
  let cacheVer = null
  let bypassCache = false
  let status = "Miss"

  // Only check for HTML GET requests (saves on reading from KV unnecessarily)
  // and not when there are cache-control headers on the request (refresh)
  const accept = request.headers.get("Accept")
  const cacheControl = request.headers.get("Cache-Control")
  let noCache = false
  if (cacheControl && cacheControl.includes("no-cache")) {
    noCache = true
    status = "Bypass for Reload"
  }
  if (!noCache && request.method === "GET" && accept && accept.includes("text/html")) {
    // Build the versioned URL for checking the cache
    cacheVer = await getCurrentCacheVersion(cacheVer)
    const cacheKeyRequest = generateCacheRequest(request, cacheVer)

    // See if there is a request match in the cache
    try {
      const cache: Cache = (caches as any).default
      const matchedResponse = await cache.match(cacheKeyRequest)
      if (matchedResponse) {
        // Copy Response object so that we can edit headers.
        const cachedResponse = new Response(matchedResponse.body, matchedResponse)

        // Check to see if the response needs to be bypassed because of a cookie
        bypassCache = shouldBypassEdgeCache(request, cachedResponse)

        // Copy the original cache headers back and clean up any control headers
        if (bypassCache) {
          status = "Bypass Cookie"
        } else {
          status = "Hit"
          cachedResponse.headers.delete("Cache-Control")
          cachedResponse.headers.delete("x-HTML-Edge-Cache-Status")
          CACHE_HEADERS.forEach(header => {
            const value = cachedResponse.headers.get("x-HTML-Edge-Cache-Header-" + header)
            if (value) {
              cachedResponse.headers.delete("x-HTML-Edge-Cache-Header-" + header)
              cachedResponse.headers.set(header, value)
            }
          })
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

/**
 * Asynchronously purge the HTML cache.
 * @param {Int} cacheVer - Current cache version (if retrieved)
 * @param {Event} event - Original event
 */
export const purgeCache = async (cacheVer: number | null, event: FetchEvent): Promise<void> => {
  if (typeof EDGE_CACHE !== "undefined") {
    // Purge the KV cache by bumping the version number
    cacheVer = await getCurrentCacheVersion(cacheVer)
    cacheVer++
    event.waitUntil(EDGE_CACHE.put(CACHE_VERSION, cacheVer.toString()))
  } else {
    // Purge everything using the API
    const url = "https://api.cloudflare.com/client/v4/zones/" + CLOUDFLARE_API.zone + "/purge_cache"
    event.waitUntil(
      fetch(url, {
        method: "POST",
        headers: {
          "X-Auth-Email": CLOUDFLARE_API.email,
          "X-Auth-Key": CLOUDFLARE_API.key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purge_everything: true }),
      })
    )
  }
}

/**
 * Cache the returned content (but only if it was a successful GET request)
 *
 * @param {Int} cacheVer - Current cache version (if already retrieved)
 * @param {Request} request - Original Request
 * @param {Response} originalResponse - Response to (maybe) cache
 * @param {Event} event - Original event
 * @returns {bool} true if the response was cached
 */
export const cacheResponse = async (
  cacheVer: number | null,
  request: Request,
  originalResponse: Response,
  event: FetchEvent
) => {
  let status = ""
  const accept = request.headers.get("Accept")
  if (
    request.method === "GET" &&
    originalResponse.status === 200 &&
    accept &&
    accept.indexOf("text/html") >= 0
  ) {
    cacheVer = await getCurrentCacheVersion(cacheVer)
    const cacheKeyRequest = generateCacheRequest(request, cacheVer)

    try {
      // Move the cache headers out of the way so the response can actually be cached.
      // First clone the response so there is a parallel body stream and then
      // create a new response object based on the clone that we can edit.
      const cache: Cache = (caches as any).default
      const clonedResponse = originalResponse.clone()
      const response = new Response(clonedResponse.body, clonedResponse)
      CACHE_HEADERS.forEach(header => {
        let value = response.headers.get(header)
        if (value) {
          response.headers.delete(header)
          response.headers.set("x-HTML-Edge-Cache-Header-" + header, value)
        }
      })
      response.headers.delete("Set-Cookie")
      response.headers.set("Cache-Control", "public; max-age=315360000")
      event.waitUntil(cache.put(cacheKeyRequest, response))
      status = ", Cached"
    } catch (err) {
      status = ", Cache Write Exception: " + err.message
    }
  }
  return status
}

/**
 * Update the cached copy of the given page
 * @param {Request} originalRequest - Original Request
 * @param {String} cacheVer - Cache Version
 * @param {EVent} event - Original event
 */
export const updateCache = async (
  originalRequest: Request,
  cacheVer: number | null,
  event: FetchEvent
) => {
  // Clone the request, add the edge-cache header and send it through.
  const request = new Request(originalRequest)
  request.headers.set("x-HTML-Edge-Cache", "supports=cache|purgeall|bypass-cookies")
  const response = await fetch(request)

  if (response) {
    // status = ": Fetched"
    const options = getResponseOptions(response)
    if (options && options.purge) {
      await purgeCache(cacheVer, event)
    }
    const bypassCache = shouldBypassEdgeCache(request, response)
    if ((!options || options.cache) && !bypassCache) {
      await cacheResponse(cacheVer, originalRequest, response, event)
    }
  }
}
