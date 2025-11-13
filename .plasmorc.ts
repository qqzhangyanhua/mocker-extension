const hosts = process.env.PLASMO_PUBLIC_HOSTS
  ? process.env.PLASMO_PUBLIC_HOSTS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["<all_urls>"]

export default {
  manifest: {
    name: "API Mocker",
    description: "接口劫持Mock工具 - 拦截和模拟HTTP请求响应",
    version: "1.0.0",
    permissions: ["storage", "activeTab", "webRequest", "webRequestBlocking"],
    host_permissions: hosts
  }
}
