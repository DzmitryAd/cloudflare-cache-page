require("dotenv").config()
import { join, resolve } from "path"
import { Configuration } from "webpack"
const { NODE_ENV } = process.env
const IS_PROD = NODE_ENV === "production"

const PROJECT_ROOT = join(__dirname, "..")
const DIST_DIR = resolve(PROJECT_ROOT, "dist")
const config: Configuration = {
  target: "webworker",
  entry: { worker: "./src/worker.ts" },
  mode: IS_PROD ? "production" : "development",
  devtool: false, // https://github.com/cloudflare/workers-webpack-example/issues/1
  optimization: {
    minimize: IS_PROD,
    runtimeChunk: false,
    splitChunks: {
      cacheGroups: {
        default: false,
      },
    },
  },
  performance: {
    hints: false,
  },
  output: {
    path: DIST_DIR,
    publicPath: "dist",
    filename: `[name].js`,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            compilerOptions: {
              target: "ES2018",
            },
          },
        },
        exclude: [/node_modules/],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      // react$: "react",
      // "react-router$": "react-router",
      // lodash: "lodash-es",
      // jss: "jss/dist/jss.min.js",
      // 'react-dropzone': 'react-dropzone/dist/index',
    },
  },
}

export default config
