import React from 'react';
import ReactDOM from 'react-dom/client';

// --- AG Grid設定ファイルを最初にインポートします ---
// これにより、Appコンポーネントが読み込まれる前に、AG Gridの機能が登録されます。
import './agGridSetup'; 

import App from './App';

// --- アプリケーションを一度だけ呼び出す、正しい記述です ---
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
