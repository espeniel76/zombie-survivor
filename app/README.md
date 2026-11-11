# 좀비 생존자 안드로이드 앱 (플러터)

웹 게임(저장소 맨 위 `src/`)을 그대로 담은 안드로이드 앱이다. 게임을 플러터로 다시 짠 것이 아니라,
웹 게임 빌드 결과를 앱 안에 넣고 화면 가득 띄운다. 인터넷 없이 돌아간다.

## 만들기

저장소 맨 위 폴더에서:

```
npm run app                  # APK 만들기 → app/build/app/outputs/flutter-apk/app-release.apk
npm run app -- --debug-web   # PC 크롬(chrome://inspect)으로 앱 속 게임을 들여다볼 수 있는 판
```

게임을 고쳤으면 이것만 다시 돌리면 된다.

- 폴더 이름에 한글이 있어서 안드로이드 빌드 도구가 경로를 못 읽는다. `npm run app`은 빌드하는 동안만
  빈 드라이브 글자(Z: 등)에 저장소를 이어 붙여 영어 경로로 빌드한다. `flutter` 명령을 직접 쓸 때도
  `subst Z: "<저장소 경로>"` 뒤 `Z:\app`에서 쓴다.
- 지금 APK는 플러터 기본 디버그 열쇠로 서명된다(직접 깔아 보기용). 플레이 스토어용(.aab)은 아직 없다.

## 구성

- `lib/main.dart`: 웹 화면(flutter_inappwebview), 뒤로 가기 버튼, 홈 버튼 처리
- 게임 쪽 창구: `src/core/app.js` (`window.__app.back/pause/resume`)
- 게임 파일 주소: `https://appassets.androidplatform.net/assets/flutter_assets/assets/game/index.html`
  (앱 안의 파일을 그 주소로 읽는다. 저장 기록도 이 주소에 묶인다)
- 아이콘: `node scripts/make-icons.mjs` → `app/icon/` → `app` 폴더에서 `dart run flutter_launcher_icons`
- 앱 고유 이름: `com.espeniel.zombiesurvivor` (`android/app/build.gradle.kts`)
