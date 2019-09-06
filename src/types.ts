export type TKvStore = {
  get: (key: string) => Promise<string | any | null>
  put: (key: string, value: string, expiration?: { expirationTtl: number }) => Promise<void>
  delete: (key: string) => Promise<void>
}

export type TCloudflareAPI = {
  CF_EMAIL: string
  CF_KEY: string
  CF_ZONE: string
}

export type TKvStoreEnv = {
  HTML_CACHE_VERSION: string
}
