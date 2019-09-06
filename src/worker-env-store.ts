import { TKvStore, TKvStoreEnv } from "./types"

const KV_STORE = (global as any).WORDPRESS_EDGE_CACHE as TKvStore

class KvEnvStore {
  private cache: TKvStoreEnv | null = null
  async getEnv() {
    if (!this.cache) {
      const env = await KV_STORE.get("EDGE_CACHE")
      this.cache = env && (JSON.parse(env) as TKvStoreEnv)
    }
    return this.cache
  }
}
export const kvEnvStore = new KvEnvStore()
