/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/worker.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./src/caching.ts":
/*!************************!*\
  !*** ./src/caching.ts ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = __webpack_require__(/*! ./const */ "./src/const.ts");
const util_1 = __webpack_require__(/*! ./util */ "./src/util.ts");
exports.getCachedResponse = async (request) => {
    let response = null;
    let cacheVer = null;
    let bypassCache = false;
    let status = "Miss";
    // Only check for HTML GET requests (saves on reading from KV unnecessarily)
    // and not when there are cache-control headers on the request (refresh)
    const accept = request.headers.get("Accept");
    const cacheControl = request.headers.get("Cache-Control");
    let noCache = false;
    if (cacheControl && cacheControl.includes("no-cache")) {
        noCache = true;
        status = "Bypass for Reload";
    }
    if (!noCache && request.method === "GET" && accept && accept.includes("text/html")) {
        // Build the versioned URL for checking the cache
        cacheVer = await util_1.getCurrentCacheVersion(cacheVer);
        const cacheKeyRequest = util_1.generateCacheRequest(request, cacheVer);
        // See if there is a request match in the cache
        try {
            const cache = caches.default;
            const matchedResponse = await cache.match(cacheKeyRequest);
            if (matchedResponse) {
                // Copy Response object so that we can edit headers.
                const cachedResponse = new Response(matchedResponse.body, matchedResponse);
                // Check to see if the response needs to be bypassed because of a cookie
                bypassCache = util_1.shouldBypassEdgeCache(request, cachedResponse);
                // Copy the original cache headers back and clean up any control headers
                if (bypassCache) {
                    status = "Bypass Cookie";
                }
                else {
                    status = "Hit";
                    cachedResponse.headers.delete("Cache-Control");
                    cachedResponse.headers.delete("x-HTML-Edge-Cache-Status");
                    const_1.CACHE_HEADERS.forEach(header => {
                        const value = cachedResponse.headers.get("x-HTML-Edge-Cache-Header-" + header);
                        if (value) {
                            cachedResponse.headers.delete("x-HTML-Edge-Cache-Header-" + header);
                            cachedResponse.headers.set(header, value);
                        }
                    });
                    response = cachedResponse;
                }
            }
            else {
                status = "Miss";
            }
        }
        catch (err) {
            // Send the exception back in the response header for debugging
            status = "Cache Read Exception: " + err.message;
        }
    }
    return { response, cacheVer, status, bypassCache };
};
/**
 * Asynchronously purge the HTML cache.
 * @param {Int} cacheVer - Current cache version (if retrieved)
 * @param {Event} event - Original event
 */
exports.purgeCache = async (cacheVer, event) => {
    if (typeof const_1.EDGE_CACHE !== "undefined") {
        // Purge the KV cache by bumping the version number
        cacheVer = await util_1.getCurrentCacheVersion(cacheVer);
        cacheVer++;
        event.waitUntil(const_1.EDGE_CACHE.put(const_1.CACHE_VERSION, cacheVer.toString()));
    }
    else {
        // Purge everything using the API
        const url = "https://api.cloudflare.com/client/v4/zones/" + const_1.CLOUDFLARE_API.zone + "/purge_cache";
        event.waitUntil(fetch(url, {
            method: "POST",
            headers: {
                "X-Auth-Email": const_1.CLOUDFLARE_API.email,
                "X-Auth-Key": const_1.CLOUDFLARE_API.key,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ purge_everything: true }),
        }));
    }
};
/**
 * Cache the returned content (but only if it was a successful GET request)
 *
 * @param {Int} cacheVer - Current cache version (if already retrieved)
 * @param {Request} request - Original Request
 * @param {Response} originalResponse - Response to (maybe) cache
 * @param {Event} event - Original event
 * @returns {bool} true if the response was cached
 */
exports.cacheResponse = async (cacheVer, request, originalResponse, event) => {
    let status = "";
    const accept = request.headers.get("Accept");
    if (request.method === "GET" &&
        originalResponse.status === 200 &&
        accept &&
        accept.indexOf("text/html") >= 0) {
        cacheVer = await util_1.getCurrentCacheVersion(cacheVer);
        const cacheKeyRequest = util_1.generateCacheRequest(request, cacheVer);
        try {
            // Move the cache headers out of the way so the response can actually be cached.
            // First clone the response so there is a parallel body stream and then
            // create a new response object based on the clone that we can edit.
            const cache = caches.default;
            const clonedResponse = originalResponse.clone();
            const response = new Response(clonedResponse.body, clonedResponse);
            const_1.CACHE_HEADERS.forEach(header => {
                let value = response.headers.get(header);
                if (value) {
                    response.headers.delete(header);
                    response.headers.set("x-HTML-Edge-Cache-Header-" + header, value);
                }
            });
            response.headers.delete("Set-Cookie");
            response.headers.set("Cache-Control", "public; max-age=315360000");
            event.waitUntil(cache.put(cacheKeyRequest, response));
            status = ", Cached";
        }
        catch (err) {
            status = ", Cache Write Exception: " + err.message;
        }
    }
    return status;
};
/**
 * Update the cached copy of the given page
 * @param {Request} originalRequest - Original Request
 * @param {String} cacheVer - Cache Version
 * @param {EVent} event - Original event
 */
exports.updateCache = async (originalRequest, cacheVer, event) => {
    // Clone the request, add the edge-cache header and send it through.
    const request = new Request(originalRequest);
    request.headers.set("x-HTML-Edge-Cache", "supports=cache|purgeall|bypass-cookies");
    const response = await fetch(request);
    if (response) {
        // status = ": Fetched"
        const options = util_1.getResponseOptions(response);
        if (options && options.purge) {
            await exports.purgeCache(cacheVer, event);
        }
        const bypassCache = util_1.shouldBypassEdgeCache(request, response);
        if ((!options || options.cache) && !bypassCache) {
            await exports.cacheResponse(cacheVer, originalRequest, response, event);
        }
    }
};


/***/ }),

/***/ "./src/const.ts":
/*!**********************!*\
  !*** ./src/const.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_VERSION = "html_cache_version";
exports.EDGE_CACHE = global.EDGE_CACHE;
exports.CACHE_HEADERS = ["Cache-Control", "Expires", "Pragma"];
exports.DEFAULT_BYPASS_COOKIES = ["wordpress_logged_in_", "comment_", "woocommerce_"];
// API settings if KV isn't being used
const CF_EMAIL = ""; // From https://dash.cloudflare.com/profile
const CF_KEY = ""; // Global API Key from https://dash.cloudflare.com/profile
const CF_ZONE = ""; // "Zone ID" from the API section of the dashboard overview page https://dash.cloudflare.com/
exports.CLOUDFLARE_API = { email: CF_EMAIL, key: CF_KEY, zone: CF_ZONE };

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./src/util.ts":
/*!*********************!*\
  !*** ./src/util.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = __webpack_require__(/*! ./const */ "./src/const.ts");
/**
 * Parse the commands from the x-HTML-Edge-Cache response header.
 * @param {Response} response - HTTP response from the origin.
 * @returns {*} Parsed commands
 */
exports.getResponseOptions = (response) => {
    let options = null;
    let header = response.headers.get("x-HTML-Edge-Cache");
    if (header) {
        options = {
            purge: false,
            cache: false,
            bypassCookies: [],
        };
        let commands = header.split(",");
        for (let command of commands) {
            if (command.trim() === "purgeall") {
                options.purge = true;
            }
            else if (command.trim() === "cache") {
                options.cache = true;
            }
            else if (command.trim().startsWith("bypass-cookies")) {
                let separator = command.indexOf("=");
                if (separator >= 0) {
                    let cookies = command.substr(separator + 1).split("|");
                    for (let cookie of cookies) {
                        cookie = cookie.trim();
                        if (cookie.length) {
                            options.bypassCookies.push(cookie);
                        }
                    }
                }
            }
        }
    }
    return options;
};
/**
 * Retrieve the current cache version from KV
 * @param {Int} cacheVer - Current cache version value if set.
 * @returns {Int} The current cache version.
 */
exports.getCurrentCacheVersion = async (cacheVer) => {
    if (cacheVer === null) {
        if (typeof const_1.EDGE_CACHE !== "undefined") {
            cacheVer = await const_1.EDGE_CACHE.get(const_1.CACHE_VERSION);
            if (cacheVer === null) {
                // Uninitialized - first time through, initialize KV with a value
                // Blocking but should only happen immediately after worker activation.
                cacheVer = 0;
                await const_1.EDGE_CACHE.put(const_1.CACHE_VERSION, cacheVer.toString());
            }
            else {
                cacheVer = parseInt(cacheVer);
            }
        }
        else {
            cacheVer = -1;
        }
    }
    return cacheVer;
};
/**
 * Generate the versioned Request object to use for cache operations.
 * @param {Request} request - Base request
 * @param {Int} cacheVer - Current Cache version (must be set)
 * @returns {Request} Versioned request object
 */
exports.generateCacheRequest = (request, cacheVer) => {
    let cacheUrl = request.url;
    if (cacheUrl.indexOf("?") >= 0) {
        cacheUrl += "&";
    }
    else {
        cacheUrl += "?";
    }
    cacheUrl += "cf_edge_cache_ver=" + cacheVer;
    return new Request(cacheUrl);
};
/**
 * Determine if the cache should be bypassed for the given request/response pair.
 * Specifically, if the request includes a cookie that the response flags for bypass.
 * Can be used on cache lookups to determine if the request needs to go to the origin and
 * origin responses to determine if they should be written to cache.
 * @param {Request} request - Request
 * @param {Response} response - Response
 * @returns {bool} true if the cache should be bypassed
 */
exports.shouldBypassEdgeCache = (request, response) => {
    let bypassCache = false;
    if (request && response) {
        const options = exports.getResponseOptions(response);
        const cookieHeader = request.headers.get("cookie");
        let bypassCookies = const_1.DEFAULT_BYPASS_COOKIES;
        if (options) {
            bypassCookies = options.bypassCookies;
        }
        if (cookieHeader && cookieHeader.length && bypassCookies.length) {
            const cookies = cookieHeader.split(";");
            for (let cookie of cookies) {
                // See if the cookie starts with any of the logged-in user prefixes
                for (let prefix of bypassCookies) {
                    if (cookie.trim().startsWith(prefix)) {
                        bypassCache = true;
                        break;
                    }
                }
                if (bypassCache) {
                    break;
                }
            }
        }
    }
    return bypassCache;
};


/***/ }),

/***/ "./src/worker.ts":
/*!***********************!*\
  !*** ./src/worker.ts ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {
Object.defineProperty(exports, "__esModule", { value: true });
const caching_1 = __webpack_require__(/*! ./caching */ "./src/caching.ts");
const const_1 = __webpack_require__(/*! ./const */ "./src/const.ts");
const util_1 = __webpack_require__(/*! ./util */ "./src/util.ts");
const handle = async (event) => {
    const request = event.request;
    let upstreamCache = request.headers.get("x-HTML-Edge-Cache");
    // Only process requests if KV store is set up and there is no
    // HTML edge cache in front of this worker (only the outermost cache
    // should handle HTML caching in case there are varying levels of support).
    let configured = false;
    if (typeof const_1.EDGE_CACHE !== "undefined") {
        configured = true;
    }
    else if (const_1.CLOUDFLARE_API.email.length &&
        const_1.CLOUDFLARE_API.key.length &&
        const_1.CLOUDFLARE_API.zone.length) {
        configured = true;
    }
    // Bypass processing of image requests (for everything except Firefox which doesn't use image/*)
    const accept = request.headers.get("Accept");
    let isImage = false;
    if (accept && accept.includes("image/*")) {
        isImage = true;
    }
    if (configured && !isImage && upstreamCache === null) {
        return processRequest(request, event);
    }
    return await fetch(request);
};
/**
 * Process every request coming through to add the edge-cache header,
 * watch for purge responses and possibly cache HTML GET requests.
 */
const processRequest = async (originalRequest, event) => {
    let cfCacheStatus = null;
    const accept = originalRequest.headers.get("Accept");
    const isHTML = accept && accept.includes("text/html");
    let { response, cacheVer, status, bypassCache } = await caching_1.getCachedResponse(originalRequest);
    if (response === null) {
        // Clone the request, add the edge-cache header and send it through.
        const request = new Request(originalRequest);
        request.headers.set("x-HTML-Edge-Cache", "supports=cache|purgeall|bypass-cookies");
        response = await fetch(request);
        if (response) {
            const options = util_1.getResponseOptions(response);
            if (options && options.purge) {
                await caching_1.purgeCache(cacheVer, event);
                status += ", Purged";
            }
            bypassCache = bypassCache || util_1.shouldBypassEdgeCache(request, response);
            if ((!options || options.cache) &&
                isHTML &&
                originalRequest.method === "GET" &&
                response.status === 200 &&
                !bypassCache) {
                status += await caching_1.cacheResponse(cacheVer, originalRequest, response, event);
            }
        }
    }
    else {
        // If the origin didn't send the control header we will send the cached response but update
        // the cached copy asynchronously (stale-while-revalidate). This commonly happens with
        // a server-side disk cache that serves the HTML directly from disk.
        cfCacheStatus = "HIT";
        if (originalRequest.method === "GET" && response.status === 200 && isHTML) {
            bypassCache = bypassCache || util_1.shouldBypassEdgeCache(originalRequest, response);
            if (!bypassCache) {
                const options = util_1.getResponseOptions(response);
                if (!options) {
                    status += ", Refreshed";
                    event.waitUntil(caching_1.updateCache(originalRequest, cacheVer, event));
                }
            }
        }
    }
    if (response &&
        status !== null &&
        originalRequest.method === "GET" &&
        response.status === 200 &&
        isHTML) {
        response = new Response(response.body, response);
        response.headers.set("x-HTML-Edge-Cache-Status", status);
        if (cacheVer !== null) {
            response.headers.set("x-HTML-Edge-Cache-Version", cacheVer.toString());
        }
        if (cfCacheStatus) {
            response.headers.set("CF-Cache-Status", cfCacheStatus);
        }
    }
    return response;
};
const try_catch_handler = async (event) => {
    try {
        const response = await handle(event);
        return response;
    }
    catch (err) {
        return new Response(err.stack || err);
    }
};
global.addEventListener("fetch", event => {
    ;
    event.passThroughOnException(); // CloudFlare specifig
    event.respondWith(try_catch_handler(event));
});

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ })

/******/ });