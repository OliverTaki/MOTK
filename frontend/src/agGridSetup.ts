// AG Gridのコア機能と、基本的な行モデルモジュールをインポートします。
// これらは全て、無料のCommunity版に含まれています。
import { ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';

// アプリケーション全体でAG Gridが使う機能モジュールを登録します。
// これをアプリケーションの入り口で一度だけ実行することで、
// ソートやフィルターなどの基本機能が有効になります。
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
]);