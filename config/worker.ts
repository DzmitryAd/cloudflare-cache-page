require("dotenv").config()
import Cloudworker from "@dollarshaveclub/cloudworker"
import { readFileSync } from "fs"
import { join, resolve } from "path"

const PROJECT_ROOT = join(__dirname, "..", "..")
export const DIST_DIR = resolve(PROJECT_ROOT, "dist")
const { PORT } = process.env
const worker_script_path = DIST_DIR + "/worker.js"
const script_string = readFileSync(worker_script_path).toString()

const init = async () => {
  const bindings = {}
  new Cloudworker(script_string, { bindings, enableCache: true }).listen(PORT)
  console.log(`Listening on ${PORT}`)
}

init()
