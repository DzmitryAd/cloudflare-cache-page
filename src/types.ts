export type TKvStore = {
  get: (key: string) => Promise<string | any | null>
  put: (key: string, value: string, expiration?: { expirationTtl: number }) => Promise<void>
  delete: (key: string) => Promise<void>
}

export type TCloudflareAPI = {
  email: string
  key: string
  zone: string
}

export type TKvStoreEnv = {
  HTML_CACHE_VERSION: string
}

export type TResponseOptions = {
  purge: boolean
  cache: boolean
  bypassCookies: string[]
}

export type TCachedResponse = {
  response: Response | null
  cacheVer: number | null
  status: string
  bypassCache: boolean
}
