import React from 'react';
import ReactDOM from 'react-dom/client';

// --- ★★★ AG Grid設定を最初にインポート ★★★ ---
import './agGridSetup'; 
// --- ★★★ 修正ここまで ★★★ ---

import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
