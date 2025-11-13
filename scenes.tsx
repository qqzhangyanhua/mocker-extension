import { ConfigProvider } from "antd"
import SceneManager from "~/components/SceneManager"

import "./scenes.css"

function ScenesIndex() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff"
        }
      }}>
      <SceneManager />
    </ConfigProvider>
  )
}

export default ScenesIndex