// 这个脚本会被注入到页面上下文中来拦截请求
// 使用 IIFE 立即执行，确保最早 Hook
(() => {
  // 立即保存原始函数引用
  const __origFetch = window.fetch;
  const __OrigXHR = window.XMLHttpRequest;
  let __enabled = true;
  let __mode = 'page';

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'API_MOCKER_SET_MODE') {
      __enabled = !!(d.payload && d.payload.enabled);
      __mode = (d.payload && d.payload.interceptMode) || 'page';
      console.log('[API Mocker] 🔧 配置已更新 - 启用状态:', __enabled, '拦截模式:', __mode);
    }
  });

  function askRule(url, method){
    console.log('[API Mocker] 🔍 查询匹配规则 - URL:', url, 'Method:', method);
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      let timeout = setTimeout(() => {
        window.removeEventListener('message', onMsg);
        console.error('[API Mocker] ⏱️ 规则查询超时 (5秒) - URL:', url);
        resolve(null);
      }, 5000);
      
      function onMsg(ev){
        const data = ev.data || {};
        if (data.type === 'API_MOCKER_RESPONSE' && data.id === id){
          clearTimeout(timeout);
          window.removeEventListener('message', onMsg);
          if (data.rule) {
            console.log('[API Mocker] ✅ 匹配到规则:', data.rule.name, '| 响应状态:', data.rule.statusCode);
          } else {
            console.warn('[API Mocker] ❌ 未找到匹配规则 - URL:', url);
          }
          resolve(data.rule || null);
        }
      }
      window.addEventListener('message', onMsg);
      window.postMessage({ type: 'API_MOCKER_REQUEST', id, url, method }, '*');
    });
  }

  async function hookFetch(input, init){
    const url = typeof input === 'string' ? input : (input && (input.url || (input instanceof URL && input.href))) || '';
    const method = (init && init.method) || 'GET';
    console.log('[API Mocker] 🌐 拦截 Fetch 请求:', url, '| 方法:', method);

    if (!__enabled) {
      console.log('[API Mocker] ⚠️ 拦截器已关闭,执行真实请求');
      return __origFetch.call(window, input, init);
    }
    
    if (__mode !== 'page') {
      console.log('[API Mocker] ⚠️ 当前模式:', __mode, '不是 page 模式,执行真实请求');
      return __origFetch.call(window, input, init);
    }

    const rule = await askRule(url, method);
    if (rule){
      console.log('[API Mocker] 🎯 使用规则返回 Mock 数据:', rule.name);
      if (rule.delay && rule.delay > 0) await new Promise(r => setTimeout(r, rule.delay));
      const headers = new Headers(rule.responseHeaders || {});
      const res = new Response(rule.responseBody || '', { status: rule.statusCode || 200, headers });
      window.postMessage({ type: 'API_MOCKER_RECORD', payload: { url, method, isMocked: true, statusCode: rule.statusCode, responseBody: rule.responseBody }}, '*');
      return res;
    }
    console.log('[API Mocker] 🔄 无匹配规则,执行真实请求');
    return __origFetch.call(window, input, init);
  }

  function hookXHR(){
    const xhr = new __OrigXHR();
    let __method = 'GET';
    let __url = '';
    let __async = true;
    let __willMock = false;
    const origOpen = xhr.open.bind(xhr);
    const origSend = xhr.send.bind(xhr);
    
    xhr.open = function(method, url, async=true, username, password){
      __method = method;
      __url = url;
      __async = async;
      console.log('[API Mocker] 📡 拦截 XHR.open:', url, '| 方法:', method);
      // 先不调用原始 open，等 send 时判断是否需要 mock
      if (!__enabled || __mode !== 'page') {
        return origOpen(method, url, async, username, password);
      }
    };
    
    xhr.send = function(body){
      console.log('[API Mocker] 📨 拦截 XHR.send:', __url);
      
      if (__enabled && __mode === 'page'){
        // 异步处理 Mock 逻辑
        (async () => {
          const rule = await askRule(__url, __method);
          if (rule){
            console.log('[API Mocker] 🎯 使用规则返回 XHR Mock 数据:', rule.name);
            
            // 延迟
            if (rule.delay && rule.delay > 0) {
              await new Promise(r => setTimeout(r, rule.delay));
            }
            
            // 完全模拟 XHR 响应
            const mockResponse = () => {
              try {
                // 设置基本属性
                Object.defineProperty(xhr, 'readyState', { writable: true, configurable: true, value: 4 });
                Object.defineProperty(xhr, 'status', { writable: true, configurable: true, value: rule.statusCode || 200 });
                Object.defineProperty(xhr, 'statusText', { writable: true, configurable: true, value: 'OK' });
                Object.defineProperty(xhr, 'responseURL', { writable: true, configurable: true, value: __url });
                
                // 设置响应内容
                const responseBody = rule.responseBody || '';
                Object.defineProperty(xhr, 'response', { writable: true, configurable: true, value: responseBody });
                Object.defineProperty(xhr, 'responseText', { writable: true, configurable: true, value: responseBody });
                
                // 如果是 JSON，尝试解析
                try {
                  const jsonData = JSON.parse(responseBody);
                  Object.defineProperty(xhr, 'responseType', { writable: true, configurable: true, value: 'json' });
                } catch (e) {
                  Object.defineProperty(xhr, 'responseType', { writable: true, configurable: true, value: 'text' });
                }
                
                // 设置响应头方法
                const headers = rule.responseHeaders || { 'Content-Type': 'application/json; charset=utf-8' };
                xhr.getAllResponseHeaders = function(){ 
                  return Object.keys(headers).map(k => k + ': ' + headers[k]).join('\r\n'); 
                };
                xhr.getResponseHeader = function(name){ 
                  const lowerName = name.toLowerCase();
                  for (const key in headers) {
                    if (key.toLowerCase() === lowerName) {
                      return headers[key];
                    }
                  }
                  return null;
                };
                
                console.log('[API Mocker] ✅ Mock 响应已设置 - 状态码:', xhr.status);
                
                // 触发所有必要的事件
                const triggerEvent = (eventType) => {
                  const event = new Event(eventType);
                  if (xhr['on' + eventType]) {
                    xhr['on' + eventType].call(xhr, event);
                  }
                  if (xhr.dispatchEvent) {
                    xhr.dispatchEvent(event);
                  }
                };
                
                // 按顺序触发事件
                triggerEvent('readystatechange');
                triggerEvent('load');
                triggerEvent('loadend');
                
              } catch (error) {
                console.error('[API Mocker] ❌ Error setting mock response:', error);
              }
            };
            
            // 使用 setTimeout 确保异步执行
            if (__async !== false) {
              setTimeout(mockResponse, 10); // 稍微延迟确保事件监听器已注册
            } else {
              mockResponse();
            }
            
            // 记录请求
            window.postMessage({ 
              type: 'API_MOCKER_RECORD', 
              payload: { 
                url: __url, 
                method: __method, 
                isMocked: true, 
                statusCode: rule.statusCode, 
                responseBody: rule.responseBody 
              }
            }, '*');
            
            return;
          }
          
          // 没有匹配规则，执行原始请求
          console.log('[API Mocker] 🔄 无匹配规则,执行真实 XHR 请求');
          origOpen.call(xhr, __method, __url, __async);
          origSend.call(xhr, body);
        })();
        
        return;
      }
      
      // 未开启或非 page 模式，执行原始请求
      origOpen.call(xhr, __method, __url, __async);
      return origSend.call(xhr, body);
    }
    
    return xhr;
  }

  try {
    // 立即 Hook，不要延迟
    Object.defineProperty(window, 'fetch', { 
      value: hookFetch, 
      writable: true,
      configurable: true 
    });
    window.XMLHttpRequest = hookXHR;
    
    console.log('[API Mocker] ✅ Hook 安装成功 - Fetch 和 XHR 已拦截');
    
    // 标记已安装
    window.__API_MOCKER_INSTALLED__ = true;
    window.__API_MOCKER_VERSION__ = '1.0.0';
    
  } catch (e) {
    console.error('[API Mocker] ❌ Hook 安装失败:', e);
  }
})();