import { onRequest as __api_proxy_js_onRequest } from "C:\\Users\\Gheffira\\Downloads\\FILE DHAFA2\\web-tools-dhafa\\functions\\api\\proxy.js"
import { onRequest as __api_ytdl_js_onRequest } from "C:\\Users\\Gheffira\\Downloads\\FILE DHAFA2\\web-tools-dhafa\\functions\\api\\ytdl.js"

export const routes = [
    {
      routePath: "/api/proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_proxy_js_onRequest],
    },
  {
      routePath: "/api/ytdl",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_ytdl_js_onRequest],
    },
  ]