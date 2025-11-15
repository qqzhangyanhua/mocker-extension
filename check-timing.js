// 在页面控制台执行此脚本来检查 Hook 安装时机

console.log('=== API Mocker 时机诊断 ===\n');

// 检查 Hook 是否已安装
console.log('1. Hook 安装状态检查:');
console.log('   window.__API_MOCKER_INSTALLED__:', window.__API_MOCKER_INSTALLED__ || false);
console.log('   window.__API_MOCKER_VERSION__:', window.__API_MOCKER_VERSION__ || 'N/A');
console.log('   fetch 是否被 Hook:', window.fetch.toString().includes('hookFetch') || window.fetch.toString().includes('API Mocker'));
console.log('   XHR 是否被 Hook:', window.XMLHttpRequest.toString().includes('hookXHR'));
console.log('');

// 检查文档状态
console.log('2. 文档状态:');
console.log('   document.readyState:', document.readyState);
console.log('   performance.now():', performance.now().toFixed(2), 'ms');
console.log('');

// 测试立即发送请求
console.log('3. 立即测试请求:');
const testUrl = '/app/api/standardList/front/getListData';

console.log('   发送测试请求到:', testUrl);
const xhr = new XMLHttpRequest();
let requestCaptured = false;

xhr.onreadystatechange = function() {
  if (xhr.readyState === 4) {
    console.log('   ✅ 请求完成!');
    console.log('   状态码:', xhr.status);
    console.log('   响应长度:', xhr.responseText.length);
    
    // 检查是否是 Mock 数据
    try {
      const data = JSON.parse(xhr.responseText);
      if (data.msg === '服务器成功返回请求的数据') {
        console.log('   🎉 这是 Mock 数据！');
      } else {
        console.log('   ⚠️  这可能不是 Mock 数据');
      }
    } catch (e) {
      console.log('   无法解析 JSON 响应');
    }
  }
};

xhr.open('POST', testUrl, true);
xhr.send(JSON.stringify({ test: true }));

console.log('   请求已发送，等待响应...\n');

// 检查控制台日志
console.log('4. 检查控制台日志:');
console.log('   请查找以下日志来确认 Hook 安装时机:');
console.log('   - [API Mocker] 🎯 Page hook script starting at ...');
console.log('   - [API Mocker] ✅ Hooks installed successfully in ... ms');
console.log('   - [API Mocker] 🚀 Starting interceptor initialization at ...');
console.log('');

// 建议
console.log('5. 如果 Mock 仍然不生效，尝试:');
console.log('   a) 完全刷新页面 (Cmd+Shift+R 或 Ctrl+Shift+F5)');
console.log('   b) 禁用浏览器缓存 (DevTools > Network > Disable cache)');
console.log('   c) 检查规则是否启用 (扩展 Options 页面)');
console.log('   d) 查看完整的控制台日志，特别是页面加载最开始的日志');
console.log('');

console.log('=== 诊断完成 ===');


