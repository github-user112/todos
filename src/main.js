import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"
import "./assets/main.css"

window.__BUILD_TIME__ = __BUILD_TIME__
window.__BUILD_VERSION__ = __BUILD_VERSION__
console.log(
  `%c📋 Todos App %cBuild: ${__BUILD_VERSION__} | ${__BUILD_TIME__}`,
  'color:#4fc08d;font-weight:bold',
  'color:#888;font-weight:normal',
)

createApp(App).use(router).mount("#app")
