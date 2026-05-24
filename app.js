// ===== JSON fetch 헬퍼: localStorage 1시간 캐시 =====
async function fetchJSON(path, ttlMs = 3600000) {
  const key = 'mini.cache.' + path;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const c = JSON.parse(raw);
      if (Date.now() - c.ts < ttlMs) return c.data;
    }
  } catch {}
  const res = await fetch(path);
  if (!res.ok) throw new Error('fetch fail: ' + path + ' ' + res.status);
  const data = await res.json();
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
  return data;
}

// ===== CounterAPI v2 (HammerTurtleWorld 워크스페이스) =====
// V2 read/up endpoint는 public이라 API key 불필요. 헤더 없이 단순 GET이라
// CORS preflight도 면제되어 브라우저에서 바로 동작.
const COUNTER_CONFIG = {
  workspace: 's-team-36-4219',
  totalKey:  'visitors-ht',
};

// ===== 탭 전환 + 동적 title =====
(function () {
  const tabs = document.querySelectorAll('.tabs button');
  const sections = document.querySelectorAll('.section');
  const TAB_TITLES = {
    home: '홈', profile: '프로필', jukebox: '쥬크박스',
    'miniroom-tab': '미니룸', photo: '사진첩',
    favorite: '즐겨찾기', diary: '일기',
  };
  const BASE_TITLE = '김재현님의 미니홈피 :: Hammer Turtle World';

  function setTitleFor(target) {
    const suffix = TAB_TITLES[target];
    document.title = (suffix && target !== 'home')
      ? `${suffix} :: 김재현님의 미니홈피`
      : BASE_TITLE;
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      const sec = document.querySelector(`.section[data-section="${target}"]`);
      if (sec) sec.classList.add('active');
      setTitleFor(target);
    });
  });

  // BGM 바의 "♥ LIST" 클릭 → Jukebox 탭으로 이동
  const bgmList = document.getElementById('bgm-list');
  if (bgmList) {
    bgmList.addEventListener('click', () => {
      const jukeTab = document.querySelector('.tabs button[data-target="jukebox"]');
      if (jukeTab) jukeTab.click();
    });
  }

  // 모바일에서는 탭 메뉴를 미니룸 바로 밑으로, 데스크톱에서는 .book-area 우측으로
  const mql = window.matchMedia('(max-width: 720px)');
  const tabsNav  = document.querySelector('.tabs');
  const bookArea = document.querySelector('.book-area');
  const center   = document.querySelector('.center');
  const miniroom = center && center.querySelector('.miniroom');
  function placeTabs() {
    if (!tabsNav || !bookArea || !miniroom) return;
    if (mql.matches) {
      if (tabsNav.previousElementSibling !== miniroom) {
        miniroom.after(tabsNav);
      }
    } else {
      if (tabsNav.parentNode !== bookArea) {
        bookArea.appendChild(tabsNav);
      }
    }
  }
  placeTabs();
  if (mql.addEventListener) mql.addEventListener('change', placeTabs);
  else if (mql.addListener) mql.addListener(placeTabs);
  // resize 안전망 (debounced)
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(placeTabs, 100);
  });
})();

// ===== TODAY / TOTAL 카운터 (CounterAPI 우선, localStorage fallback) =====
(async function () {
  const todayEl = document.getElementById('today-count');
  const totalEl = document.getElementById('total-count');

  // 같은 브라우저는 하루 1회만 /up. /stats는 localStorage에 1시간 캐시.
  // /up 직후엔 캐시 무효화해서 본인 +1이 즉시 반영되게 함.
  const STATS_CACHE_KEY = 'mini.statsCache';
  const STATS_CACHE_TTL = 60 * 60 * 1000;  // 1시간

  function loadStatsCache(today) {
    try {
      const raw = localStorage.getItem(STATS_CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      const fresh = (Date.now() - c.ts) < STATS_CACHE_TTL;
      const sameDay = c.date === today;
      if (!fresh || !sameDay) return null;
      return { total: c.total, today: c.today };
    } catch { return null; }
  }

  function saveStatsCache(today, total, todayCount) {
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({
      ts: Date.now(), date: today, total, today: todayCount,
    }));
  }

  async function tryRemote() {
    if (!COUNTER_CONFIG.workspace) return false;
    const today = new Date().toISOString().slice(0, 10);
    const lastCounted = localStorage.getItem('mini.lastCounted');
    const base = `https://api.counterapi.dev/v2/${COUNTER_CONFIG.workspace}/${COUNTER_CONFIG.totalKey}`;

    if (lastCounted !== today) {
      const upRes = await fetch(`${base}/up`);
      if (!upRes.ok) throw new Error('CounterAPI /up bad status: ' + upRes.status);
      localStorage.setItem('mini.lastCounted', today);
      localStorage.removeItem(STATS_CACHE_KEY);  // 본인 +1 즉시 반영
    }

    const cached = loadStatsCache(today);
    if (cached) {
      totalEl.textContent = cached.total.toLocaleString('ko-KR');
      todayEl.textContent = cached.today;
      return true;
    }

    const statRes = await fetch(`${base}/stats`);
    if (!statRes.ok) throw new Error('CounterAPI /stats bad status: ' + statRes.status);
    const json = await statRes.json();
    const totCount = json.data?.up_count ?? 0;
    const todCount = json.data?.stats?.today?.up ?? 0;
    totalEl.textContent = totCount.toLocaleString('ko-KR');
    todayEl.textContent = todCount;
    saveStatsCache(today, totCount, todCount);
    return true;
  }

  // API 실패 시: 가짜 숫자 대신 솔직하게 ?
  function fallbackLocal() {
    todayEl.textContent = '?';
    totalEl.textContent = '?';
  }

  try {
    const ok = await tryRemote();
    if (!ok) fallbackLocal();
  } catch (_) {
    fallbackLocal();
  }
})();

// ===== Profile: profile.json → 자기소개 리스트 =====
(async function loadProfile() {
  const list = document.getElementById('profile-list');
  if (!list) return;
  try {
    const fields = await fetchJSON('data/profile.json');
    if (!Array.isArray(fields)) throw new Error('profile bad payload');
    list.innerHTML = '';
    fields.forEach(f => {
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = (f.label || '') + ':';
      li.appendChild(b);
      li.appendChild(document.createTextNode(' ' + (f.value || '')));
      list.appendChild(li);
    });
  } catch (_) {
    list.innerHTML = '<li class="diary-loading">프로필을 불러올 수 없어요.</li>';
  }
})();

// ===== Miniroom: miniroom.json → image + intro + items + dotori =====
(async function loadMiniroom() {
  const imgEl      = document.getElementById('miniroom-img');
  const intro      = document.getElementById('miniroom-intro');
  const itemsWrap  = document.getElementById('miniroom-items-wrap');
  const itemsEl    = document.getElementById('miniroom-items');
  const dotoriWrap = document.getElementById('miniroom-dotori-wrap');
  const dotoriEl   = document.getElementById('miniroom-dotori');
  if (!intro) return;
  try {
    const data = await fetchJSON('data/miniroom.json');
    if (imgEl && data.image) imgEl.src = data.image;
    if (imgEl && data.alt)   imgEl.alt = data.alt;
    if (data.intro) intro.textContent = data.intro;
    if (Array.isArray(data.items) && data.items.length > 0) {
      itemsEl.textContent = data.items.join(', ');
      itemsWrap.hidden = false;
    }
    if (typeof data.dotori === 'number') {
      dotoriEl.textContent = data.dotori;
      dotoriWrap.hidden = false;
    }
  } catch (_) {
    intro.textContent = '미니룸 정보를 불러올 수 없어요.';
  }
})();

// ===== Favorites: favorites.json → 왼쪽 드롭다운 + Favorite 섹션 동시 렌더 =====
(async function loadFavorites() {
  const select = document.getElementById('fav-select');
  const list   = document.getElementById('favorite-list');
  if (!select && !list) return;
  try {
    const items = await fetchJSON('data/favorites.json');
    if (!Array.isArray(items) || items.length === 0) throw new Error('favorites empty');

    // 왼쪽 드롭다운: 선택 시 새 탭으로 이동
    if (select) {
      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.url;
        opt.textContent = `${item.emoji || '·'} ${item.title}`;
        select.appendChild(opt);
      });
      select.addEventListener('change', e => {
        const url = e.target.value;
        if (!url) return;
        window.open(url, '_blank', 'noopener');
        e.target.selectedIndex = 0;  // 같은 옵션 재선택 가능하도록 리셋
      });
    }

    // Favorite 섹션: emoji + title + note
    if (list) {
      list.innerHTML = '';
      items.forEach(item => {
        const li = document.createElement('li');
        li.appendChild(document.createTextNode((item.emoji || '·') + ' '));
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.title;
        li.appendChild(a);
        if (item.note) li.appendChild(document.createTextNode(' — ' + item.note));
        list.appendChild(li);
      });
    }
  } catch (_) {
    if (list)   list.innerHTML = '<li class="diary-loading">즐겨찾기를 불러올 수 없어요.</li>';
    if (select) select.disabled = true;
  }
})();

// ===== Photo: photos.json → 사진첩 격자 (3장씩 페이지네이션) =====
(async function loadPhotos() {
  const grid = document.getElementById('photo-grid');
  const caption = document.getElementById('photo-caption');
  if (!grid) return;
  try {
    const items = await fetchJSON('data/photos.json');
    if (!Array.isArray(items)) throw new Error('photos bad payload');
    if (items.length === 0) {
      grid.innerHTML = '<div class="photo-cell photo-loading">사진이 없어요</div>';
      return;
    }

    const pageSize = 3;
    const totalPages = Math.ceil(items.length / pageSize);
    let page = 0;
    const nav      = document.getElementById('photo-nav');
    const prevBtn  = document.getElementById('photo-prev');
    const nextBtn  = document.getElementById('photo-next');
    const pageInfo = document.getElementById('photo-page-info');

    function renderPage() {
      const start = page * pageSize;
      const slice = items.slice(start, start + pageSize);
      grid.innerHTML = '';
      slice.forEach(item => {
        const cell = document.createElement('div');
        cell.className = 'photo-cell photo-cell-img';
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt || item.caption || '';
        img.loading = 'lazy';
        cell.appendChild(img);
        grid.appendChild(cell);
      });
      if (totalPages > 1) {
        nav.hidden = false;
        prevBtn.disabled = page === 0;
        nextBtn.disabled = page >= totalPages - 1;
        pageInfo.textContent = `(${page + 1} / ${totalPages})`;
      }
    }
    prevBtn.addEventListener('click', () => { if (page > 0) { page--; renderPage(); }});
    nextBtn.addEventListener('click', () => { if (page < totalPages - 1) { page++; renderPage(); }});
    renderPage();
    if (caption) caption.textContent = `※ 추억의 폴라로이드 ${items.length}장`;
  } catch (_) {
    grid.innerHTML = '<div class="photo-cell photo-loading">사진을 불러올 수 없어요</div>';
  }
})();

// ===== Jukebox: jukebox.json 기반 (페이지네이션 5개씩, bgm-bar 동기화) =====
(async function loadJukebox() {
  const list = document.getElementById('jukebox-list');
  if (!list) return;
  const bgmToggle = document.getElementById('bgm-toggle');
  const bgmTrack  = document.querySelector('.bgm-track');
  try {
    const data = await fetchJSON('data/jukebox.json');
    const tracks = Array.isArray(data.tracks) ? data.tracks : [];
    if (tracks.length === 0) throw new Error('jukebox empty');
    const current = tracks.find(t => t.current) || tracks[0];

    // bgm-bar 동기화
    if (current && bgmToggle) bgmToggle.href = current.url;
    if (current && bgmTrack)  bgmTrack.textContent = current.title;

    // 페이지네이션
    const pageSize = 5;
    const totalPages = Math.ceil(tracks.length / pageSize);
    let page = 0;
    const nav      = document.getElementById('jukebox-nav');
    const prevBtn  = document.getElementById('jukebox-prev');
    const nextBtn  = document.getElementById('jukebox-next');
    const pageInfo = document.getElementById('jukebox-page-info');

    function renderPage() {
      const start = page * pageSize;
      const slice = tracks.slice(start, start + pageSize);
      list.innerHTML = '';
      slice.forEach((t, i) => {
        const li = document.createElement('li');
        const num = String(start + i + 1).padStart(2, '0');
        const a = document.createElement('a');
        a.href = t.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = t.title;
        li.appendChild(document.createTextNode(num + '. '));
        li.appendChild(a);
        if (t === current) {
          const tag = document.createElement('small');
          tag.className = 'now-playing';
          tag.textContent = ' (현재곡 ▶)';
          li.appendChild(tag);
        }
        list.appendChild(li);
      });
      if (totalPages > 1) {
        nav.hidden = false;
        prevBtn.disabled = page === 0;
        nextBtn.disabled = page >= totalPages - 1;
        pageInfo.textContent = `(${page + 1} / ${totalPages})`;
      }
    }
    prevBtn.addEventListener('click', () => { if (page > 0) { page--; renderPage(); }});
    nextBtn.addEventListener('click', () => { if (page < totalPages - 1) { page++; renderPage(); }});
    renderPage();
  } catch (_) {
    list.innerHTML = '<li class="diary-loading">jukebox.json을 불러올 수 없어요.</li>';
  }
})();

// ===== Diary RSS (Updated News 헤더 3개 + Diary 탭 페이지네이션 5개씩) =====
(async function loadDiary() {
  const diaryList = document.getElementById('diary-list');
  const newsList  = document.getElementById('news-list');
  if (!diaryList && !newsList) return;

  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const isNew = (s) => {
    if (!s) return false;
    const t = new Date((s || '').replace(' ', 'T')).getTime();
    return !isNaN(t) && (now - t) < ONE_MONTH_MS;
  };

  const rssUrl = encodeURIComponent('https://rss.blog.naver.com/will_be_strong.xml');
  let items;
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
    if (!res.ok) throw new Error('rss2json status: ' + res.status);
    const json = await res.json();
    if (json.status !== 'ok' || !Array.isArray(json.items) || json.items.length === 0) {
      throw new Error('rss2json empty');
    }
    items = json.items;
  } catch (_) {
    const errMsg = '<li class="diary-loading">일기를 불러올 수 없어요. <a href="https://blog.naver.com/will_be_strong" target="_blank" rel="noopener">블로그 직접 방문 ▶</a></li>';
    if (diaryList) diaryList.innerHTML = errMsg;
    if (newsList)  newsList.querySelectorAll('.news-loading').forEach(el => el.remove());
    return;
  }

  // ----- Updated News (헤더 영역, 최신 3개) -----
  if (newsList) {
    newsList.querySelectorAll('.news-item, .news-loading').forEach(el => el.remove());
    items.slice(0, 3).forEach(item => {
      const li = document.createElement('li');
      li.className = 'news-item';
      const a = document.createElement('a');
      a.href = item.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = item.title;
      if (item.description) {
        const preview = item.description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
        if (preview) a.title = preview + (item.description.length > 200 ? '...' : '');
      }
      if (isNew(item.pubDate)) a.classList.add('new');
      li.appendChild(a);
      newsList.appendChild(li);
    });
  }

  // ----- Diary 탭 (5개씩 페이지네이션) -----
  if (diaryList) {
    const pageSize = 5;
    const totalPages = Math.ceil(items.length / pageSize);
    let page = 0;
    const nav      = document.getElementById('diary-nav');
    const prevBtn  = document.getElementById('diary-prev');
    const nextBtn  = document.getElementById('diary-next');
    const pageInfo = document.getElementById('diary-page-info');

    function renderPage() {
      const start = page * pageSize;
      const slice = items.slice(start, start + pageSize);
      diaryList.innerHTML = '';
      slice.forEach(item => {
        const li = document.createElement('li');
        const date = (item.pubDate || '').slice(0, 10).replace(/-/g, '.');
        const dateSpan = document.createElement('span');
        dateSpan.className = 'diary-date';
        dateSpan.textContent = date;
        const a = document.createElement('a');
        a.href = item.link;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.title;
        if (item.description) {
          const preview = item.description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
          if (preview) a.title = preview + (item.description.length > 200 ? '...' : '');
        }
        li.appendChild(dateSpan);
        li.appendChild(document.createTextNode(' '));
        li.appendChild(a);
        if (isNew(item.pubDate)) a.classList.add('new');
        diaryList.appendChild(li);
      });
      if (totalPages > 1) {
        nav.hidden = false;
        prevBtn.disabled = page === 0;
        nextBtn.disabled = page >= totalPages - 1;
        pageInfo.textContent = `(${page + 1} / ${totalPages})`;
      }
    }
    prevBtn.addEventListener('click', () => { if (page > 0) { page--; renderPage(); }});
    nextBtn.addEventListener('click', () => { if (page < totalPages - 1) { page++; renderPage(); }});
    renderPage();
  }
})();

