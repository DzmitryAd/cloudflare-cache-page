import { CACHE_VERSION, DEFAULT_BYPASS_COOKIES, EDGE_CACHE } from "./const"
import { TResponseOptions } from "./types"

/**
 * Parse the commands from the x-HTML-Edge-Cache response header.
 * @param {Response} response - HTTP response from the origin.
 * @returns {*} Parsed commands
 */
export const getResponseOptions = (response: Response): TResponseOptions | null => {
  let options: TResponseOptions | null = null
  let header = response.headers.get("x-HTML-Edge-Cache")
  if (header) {
    options = {
      purge: false,
      cache: false,
      bypassCookies: [],
    }
    let commands = header.split(",")
    for (let command of commands) {
      if (command.trim() === "purgeall") {
        options.purge = true
      } else if (command.trim() === "cache") {
        options.cache = true
      } else if (command.trim().startsWith("bypass-cookies")) {
        let separator = command.indexOf("=")
        if (separator >= 0) {
          let cookies = command.substr(separator + 1).split("|")
          for (let cookie of cookies) {
            cookie = cookie.trim()
            if (cookie.length) {
              options.bypassCookies.push(cookie)
            }
          }
        }
      }
    }
  }

  return options
}

/**
 * Retrieve the current cache version from KV
 * @param {Int} cacheVer - Current cache version value if set.
 * @returns {Int} The current cache version.
 */
export const getCurrentCacheVersion = async (cacheVer: number | null): Promise<number> => {
  if (cacheVer === null) {
    if (typeof EDGE_CACHE !== "undefined") {
      cacheVer = await EDGE_CACHE.get(CACHE_VERSION)
      if (cacheVer === null) {
        // Uninitialized - first time through, initialize KV with a value
        // Blocking but should only happen immediately after worker activation.
        cacheVer = 0
        await EDGE_CACHE.put(CACHE_VERSION, cacheVer.toString())
      } else {
        cacheVer = parseInt((cacheVer as unknown) as string)
      }
    } else {
      cacheVer = -1
    }
  }
  return cacheVer
}

/**
 * Generate the versioned Request object to use for cache operations.
 * @param {Request} request - Base request
 * @param {Int} cacheVer - Current Cache version (must be set)
 * @returns {Request} Versioned request object
 */
export const generateCacheRequest = (request: Request, cacheVer: number): Request => {
  let cacheUrl = request.url
  if (cacheUrl.indexOf("?") >= 0) {
    cacheUrl += "&"
  } else {
    cacheUrl += "?"
  }
  cacheUrl += "cf_edge_cache_ver=" + cacheVer
  return new Request(cacheUrl)
}

/**
 * Determine if the cache should be bypassed for the given request/response pair.
 * Specifically, if the request includes a cookie that the response flags for bypass.
 * Can be used on cache lookups to determine if the request needs to go to the origin and
 * origin responses to determine if they should be written to cache.
 * @param {Request} request - Request
 * @param {Response} response - Response
 * @returns {bool} true if the cache should be bypassed
 */
export const shouldBypassEdgeCache = (request: Request, response: Response): boolean => {
  let bypassCache = false

  if (request && response) {
    const options = getResponseOptions(response)
    const cookieHeader = request.headers.get("cookie")
    let bypassCookies = DEFAULT_BYPASS_COOKIES
    if (options) {
      bypassCookies = options.bypassCookies
    }
    if (cookieHeader && cookieHeader.length && bypassCookies.length) {
      const cookies = cookieHeader.split(";")
      for (let cookie of cookies) {
        // See if the cookie starts with any of the logged-in user prefixes
        for (let prefix of bypassCookies) {
          if (cookie.trim().startsWith(prefix)) {
            bypassCache = true
            break
          }
        }
        if (bypassCache) {
          break
        }
      }
    }
  }

  return bypassCache
}
