const CACHE_NAME = 'pokepoke-tracker-cache-v1';
// キャッシュするファイルのリスト
// HTMLファイル名、CSS、主要なJSライブラリ、アイコンパスなどをここに追加します。
// 今回はTailwindをCDNから読み込んでいるため、キャッシュ戦略によってはオフラインでスタイルが効かない可能性があります。
// より高度なオフライン対応をする場合は、Tailwindをローカルに持つか、CDNリソースもキャッシュ対象にする必要があります。
const urlsToCache = [
  '.', // index.html (またはこのHTMLファイル名)
  'manifest.json', // マニフェストファイル
  // 'css/style.css', // もしローカルCSSファイルがあれば
  // 'js/main.js', // もしローカルJSファイルがあれば
  'icons/icon-192x192.png', // アイコンのパス
  'icons/icon-512x512.png'  // アイコンのパス
  // 注意: cdn.tailwindcss.com や fonts.googleapis.com のリソースはデフォルトではキャッシュされません。
  // これらもキャッシュしたい場合は、fetchイベント内でネットワークリクエストをインターセプトし、キャッシュに保存する処理が必要です。
];

// インストール処理
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // urlsToCache に含まれるアセットをキャッシュします。
        // addAllはアトミックな操作で、一つでも失敗すると全体が失敗します。
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache:', error);
          // 特定のファイルでキャッシュに失敗しても、他の処理は続けたい場合があるかもしれません。
          // ここではエラーをログに出力するだけに留めます。
        });
      })
  );
});

// リクエスト処理 (キャッシュ優先、なければネットワークから取得)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す
        if (response) {
          return response;
        }
        // キャッシュがなければネットワークから取得
        return fetch(event.request).then(
          networkResponse => {
            // レスポンスが有効か確認
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              // CDNなどクロスオリジンのリソースは networkResponse.type が 'opaque' になることがあります。
              // opaqueなレスポンスはキャッシュできますが、中身は確認できません。
              // ここでは 'basic' type (同一オリジン) のみキャッシュを試みています。
              // より柔軟なキャッシュ戦略が必要な場合は、この条件を調整してください。
              if (networkResponse && networkResponse.type === 'opaque') {
                 // opaqueレスポンスもキャッシュしたい場合は、ここでクローンしてキャッシュに入れる
                 // ただし、エラーハンドリングや更新戦略に注意が必要です。
              }
              return networkResponse;
            }

            // レスポンスをクローンしてキャッシュに保存 (レスポンスはストリームなので一度しか使えないため)
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
            console.error("Fetch failed; returning offline page instead.", error);
            // オフライン用の代替ページを表示することもできます
            // return caches.match('offline.html'); 
        });
      })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
