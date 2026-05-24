# 김재현님의 미니홈피 :: Hammer Turtle World

2002년 감성으로 재현한 김재현(HammerTurtle)의 개인 미니홈피.
GitHub Pages에 정적 배포, 콘텐츠는 JSON 파일로 관리.

🌐 **Live**: <https://hammerturtle.xyz>

---

## 📁 파일 구조

```
.
├── index.html          # 마크업 (~180줄)
├── styles.css          # 스타일 (~650줄)
├── app.js              # 로직 (탭/카운터/RSS/JSON 로딩, ~470줄)
├── CNAME               # GitHub Pages 도메인
├── README.md
├── data/               # 콘텐츠 JSON
│   ├── jukebox.json    # BGM 곡 목록
│   ├── favorites.json  # 즐겨찾기 링크
│   ├── photos.json     # 사진첩
│   ├── profile.json    # 자기소개
│   └── miniroom.json   # 미니룸 (이미지+가구+도토리)
└── images/
    ├── favicon.png
    ├── profile.jpg     # 아바타
    └── miniroom.png    # 미니룸 액자
```

---

## ✏️ 콘텐츠 편집 가이드

모든 콘텐츠는 `data/*.json`에서 관리. HTML/JS 만질 필요 없음.

### 🎵 BGM 곡 추가 (`data/jukebox.json`)

```json
{
  "tracks": [
    {
      "title": "아티스트 — 곡명",
      "url": "https://www.youtube.com/watch?v=...",
      "current": true       // 한 곡에만, BGM 바와 현재곡 표시 동기화
    }
  ]
}
```

### 🌟 즐겨찾기 추가 (`data/favorites.json`)

```json
[
  {
    "emoji": "🎲",
    "title": "표시명",
    "url": "https://...",
    "note": "한 줄 설명 (선택)"
  }
]
```

왼쪽 드롭다운과 Favorite 탭에 동시 반영.

### 📸 사진 추가 (`data/photos.json`)

```json
[
  {
    "src": "images/사진파일.jpg",
    "alt": "접근성용 설명",
    "caption": "캡션 (선택)"
  }
]
```

3장씩 페이지네이션 자동.

### 🧑 자기소개 수정 (`data/profile.json`)

```json
[
  { "label": "이름", "value": "..." },
  { "label": "별명", "value": "..." }
]
```

### 🏠 미니룸 수정 (`data/miniroom.json`)

```json
{
  "image": "images/miniroom.png",
  "alt": "이미지 설명",
  "intro": "미니룸 한 줄 소개",
  "items": ["가구1", "가구2"],
  "dotori": 42
}
```

---

## 🔌 외부 의존성

| 서비스 | 용도 | 인증 | 비고 |
|---|---|---|---|
| Google Fonts | Press Start 2P, Gaegu, Nanum Gothic Coding | 없음 | |
| [counterapi.dev](https://counterapi.dev) v2 | TODAY/TOTAL 방문자 | 없음 (public read+up) | 같은 브라우저 하루 1회 카운트 |
| [rss2json.com](https://rss2json.com) | 네이버 블로그 RSS 프록시 | 없음 | count 파라미터는 유료 → 클라이언트 slice |

모두 무료 + 가입 불필요. 다운되면 localStorage fallback 또는 안내 메시지.

---

## 🛠 로컬 실행

```bash
python3 -m http.server 8765
# http://127.0.0.1:8765/
```

---

## 🚀 배포

GitHub Pages 자동 배포. `main` 브랜치에 push 시 반영.

```bash
git add . && git commit -m "..." && git push
```

---

## 🎨 디자인 결정

- **클래식 하늘색**: `--sky-1` ~ `--sky-4` 파스텔 블루 (싸이월드 원조 톤)
- **책 + 책갈피**: `.spread`가 책 본체, `.tabs`가 옆에 박힌 책갈피
- **N 배지**: 1달 이내 글에 자동 표시 (`.new` 글로벌 클래스)
- **현재곡 펄스**: BGM 현재곡 옆에 빨강↔노랑 깜빡임 (레트로 GIF 감성)
- **모바일 풀스크린**: 720px 이하에서 카드 형태 → 풀스크린 앱 형태로 전환

---

## ⓒ 1998-ing... HammerTurtle 🔨🐢
