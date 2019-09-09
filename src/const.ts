import { TCloudflareAPI, TKvStore } from "./types"

export const CACHE_VERSION = "html_cache_version"

export const EDGE_CACHE: TKvStore | undefined = (global as any).WORDPRESS_EDGE_CACHE as TKvStore

export const CACHE_HEADERS = ["Cache-Control", "Expires", "Pragma"]

export const DEFAULT_BYPASS_COOKIES = ["wp-", "wordpress", "comment_", "woocommerce_"]

// API settings if KV isn't being used
const CF_EMAIL = "" // From https://dash.cloudflare.com/profile
const CF_KEY = "" // Global API Key from https://dash.cloudflare.com/profile
const CF_ZONE = "" // "Zone ID" from the API section of the dashboard overview page https://dash.cloudflare.com/

export const CLOUDFLARE_API: TCloudflareAPI = { email: CF_EMAIL, key: CF_KEY, zone: CF_ZONE }
