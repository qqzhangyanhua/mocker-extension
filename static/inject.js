// 这个脚本会被注入到页面上下文中来拦截请求
(() => {
  console.log('[API Mocker] Page hook script starting...');
  const __origFetch = window.fetch;
  const __OrigXHR = window.XMLHttpRequest;
  let __enabled = true;
  let __mode = 'page';

  console.log('[API Mocker] Original fetch:', typeof __origFetch);
  console.log('[API Mocker] Original XHR:', typeof __OrigXHR);

  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'API_MOCKER_SET_MODE') {
      __enabled = !!(d.payload && d.payload.enabled);
      __mode = (d.payload && d.payload.interceptMode) || 'page';
      console.log('[API Mocker] Mode updated - Enabled:', __enabled, 'Mode:', __mode);
    }
  });

  function askRule(url, method){
    console.log('[API Mocker] Asking for rule - URL:', url, 'Method:', method);
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      function onMsg(ev){
        const data = ev.data || {};
        if (data.type === 'API_MOCKER_RESPONSE' && data.id === id){
          window.removeEventListener('message', onMsg);
          console.log('[API Mocker] Rule response received:', data.rule);
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
    console.log('[API Mocker] Fetch intercepted - URL:', url, 'Method:', method, 'Enabled:', __enabled, 'Mode:', __mode);

    if (!__enabled || __mode !== 'page') return __origFetch.call(window, input, init);

    const rule = await askRule(url, method);
    if (rule){
      console.log('[API Mocker] Mocking response with rule:', rule.name);
      if (rule.delay && rule.delay > 0) await new Promise(r => setTimeout(r, rule.delay));
      const headers = new Headers(rule.responseHeaders || {});
      const res = new Response(rule.responseBody || '', { status: rule.statusCode || 200, headers });
      window.postMessage({ type: 'API_MOCKER_RECORD', payload: { url, method, isMocked: true, statusCode: rule.statusCode, responseBody: rule.responseBody }}, '*');
      return res;
    }
    return __origFetch.call(window, input, init);
  }

  function hookXHR(){
    const xhr = new __OrigXHR();
    let __method = 'GET';
    let __url = '';
    const origOpen = xhr.open.bind(xhr);
    const origSend = xhr.send.bind(xhr);
    xhr.open = function(method, url, async=true, username, password){
      __method = method;
      __url = url;
      console.log('[API Mocker] XHR.open called - URL:', url, 'Method:', method);
      return origOpen(method, url, async, username, password);
    };
    xhr.send = async function(body){
      console.log('[API Mocker] XHR.send called - URL:', __url, 'Method:', __method, 'Enabled:', __enabled, 'Mode:', __mode);
      if (__enabled && __mode === 'page'){
        const rule = await askRule(__url, __method);
        if (rule){
          console.log('[API Mocker] Mocking XHR response with rule:', rule.name);
          if (rule.delay && rule.delay > 0) await new Promise(r => setTimeout(r, rule.delay));
          Object.defineProperty(xhr, 'readyState', { writable: true, value: 4 });
          Object.defineProperty(xhr, 'status', { writable: true, value: rule.statusCode || 200 });
          Object.defineProperty(xhr, 'statusText', { writable: true, value: 'OK' });
          Object.defineProperty(xhr, 'response', { writable: true, value: rule.responseBody || '' });
          Object.defineProperty(xhr, 'responseText', { writable: true, value: rule.responseBody || '' });
          xhr.getAllResponseHeaders = function(){ const h = rule.responseHeaders || {}; return Object.keys(h).map(k => k+': '+h[k]).join('\r\n'); };
          xhr.onload && xhr.onload(new Event('load'));
          xhr.onreadystatechange && xhr.onreadystatechange(new Event('readystatechange'));
          window.postMessage({ type: 'API_MOCKER_RECORD', payload: { url: __url, method: __method, isMocked: true, statusCode: rule.statusCode, responseBody: rule.responseBody }}, '*');
          return;
        }
      }
      return origSend(body);
    }
    return xhr;
  }

  try {
    Object.defineProperty(window, 'fetch', { value: hookFetch, configurable: true });
    window.XMLHttpRequest = hookXHR;
    console.log('[API Mocker] Hooks installed successfully');
    console.log('[API Mocker] window.fetch is now hooked:', window.fetch !== __origFetch);
    console.log('[API Mocker] window.XMLHttpRequest is now hooked:', window.XMLHttpRequest !== __OrigXHR);
  } catch (e) {
    console.warn('[API Mocker] inject hook failed:', e);
  }

  console.log('[API Mocker] Page hook installation complete');
})();