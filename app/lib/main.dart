// 좀비 생존자 안드로이드 앱.
//
// 게임은 웹 게임(Phaser) 그대로다. 앱 안에 들어 있는 게임 파일(assets/game)을 화면 가득 띄운다.
// 게임 파일은 https://appassets.androidplatform.net/ 주소로 앱 안에서 바로 읽어서 인터넷 없이 돌아간다.
// (file:// 로 열면 브라우저 보안 규칙 때문에 게임 코드가 불러와지지 않는다.)
//
// 게임 파일 새로 넣기 + 앱 만들기: 저장소 맨 위 폴더에서 `npm run app`
// 게임 쪽 창구(뒤로 가기, 일시정지)는 src/core/app.js 에 있다.

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

// 게임 불러오기 화면과 같은 색(index.html #loader)
const _bg = Color(0xFF11151A);
final _gameUrl = WebUri('https://appassets.androidplatform.net/assets/flutter_assets/assets/game/index.html');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  // 디버그 빌드(또는 --dart-define=WEB_DEBUG=true)에서는 PC 크롬(chrome://inspect)으로 게임 화면을 들여다볼 수 있다
  if (kDebugMode || const bool.fromEnvironment('WEB_DEBUG')) {
    await InAppWebViewController.setWebContentsDebuggingEnabled(true);
  }
  runApp(const ZombieSurvivorApp());
}

class ZombieSurvivorApp extends StatelessWidget {
  const ZombieSurvivorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '좀비 생존자',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: _bg,
        colorScheme: const ColorScheme.dark(surface: _bg),
      ),
      home: const GamePage(),
    );
  }
}

class GamePage extends StatefulWidget {
  const GamePage({super.key});

  @override
  State<GamePage> createState() => _GamePageState();
}

class _GamePageState extends State<GamePage> with WidgetsBindingObserver {
  InAppWebViewController? _web;

  // 웹 화면이 처음 그려지기 전의 흰 화면이 보이지 않게 덮어 두는 판(천천히 사라짐, 번쩍임 없음)
  bool _cover = true;

  // "한 번 더 누르면 종료" 안내
  DateTime? _lastExitPress;
  bool _exitHint = false;
  Timer? _hintTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _hintTimer?.cancel();
    super.dispose();
  }

  // 게임 쪽 창구(window.__app) 부르기. 게임이 아직 안 켜졌으면 null
  Future<String?> _call(String fn) async {
    final web = _web;
    if (web == null) return null;
    try {
      final r = await web.evaluateJavascript(source: 'window.__app ? window.__app.$fn() : null');
      return r?.toString();
    } catch (_) {
      return null;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final web = _web;
    if (web == null) return;
    if (state == AppLifecycleState.hidden) {
      // 홈 버튼·전화 등으로 앱이 뒤로 감: 저장 + 일시정지 창 + 소리 끄기, 그다음 웹 화면을 재운다
      _call('pause').whenComplete(() {
        web.pause();
        web.pauseTimers();
      });
    } else if (state == AppLifecycleState.resumed) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      web.resumeTimers();
      web.resume();
      _call('resume');
    }
  }

  Future<void> _onBack() async {
    final r = await _call('back');
    if (r != null && r != 'exit') return; // 게임이 알아서 처리(창 닫기, 일시정지 등)
    final now = DateTime.now();
    if (_lastExitPress != null && now.difference(_lastExitPress!) < const Duration(seconds: 2)) {
      await _call('pause'); // 저장
      await SystemNavigator.pop();
      return;
    }
    _lastExitPress = now;
    setState(() => _exitHint = true);
    _hintTimer?.cancel();
    _hintTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _exitHint = false);
    });
  }

  void _reveal() {
    if (_cover && mounted) setState(() => _cover = false);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onBack();
      },
      child: Scaffold(
        backgroundColor: _bg,
        body: Stack(
          children: [
            Positioned.fill(
              child: InAppWebView(
                initialUrlRequest: URLRequest(url: _gameUrl),
                initialSettings: InAppWebViewSettings(
                  webViewAssetLoader: WebViewAssetLoader(
                    pathHandlers: [AssetsPathHandler(path: '/assets/')],
                  ),
                  // 인터넷은 안 쓴다(인터넷 권한도 없음). 게임 파일은 위 asset loader가 앱 안에서 준다
                  blockNetworkLoads: true,
                  mediaPlaybackRequiresUserGesture: false,
                  supportZoom: false,
                  builtInZoomControls: false,
                  displayZoomControls: false,
                  overScrollMode: OverScrollMode.NEVER,
                  verticalScrollBarEnabled: false,
                  horizontalScrollBarEnabled: false,
                  disableContextMenu: true,
                  disableLongPressContextMenuOnLinks: true,
                  cacheMode: CacheMode.LOAD_NO_CACHE,
                  applicationNameForUserAgent: 'ZombieSurvivorApp',
                ),
                onWebViewCreated: (c) => _web = c,
                onPageCommitVisible: (_, _) => _reveal(),
                onLoadStop: (_, _) => _reveal(),
                onConsoleMessage: (_, m) {
                  if (kDebugMode) debugPrint('[game] ${m.message}');
                },
                // 웹 화면이 메모리 부족 등으로 죽으면 다시 켠다(저장은 남아 있다)
                onRenderProcessGone: (c, _) => c.reload(),
              ),
            ),
            IgnorePointer(
              child: AnimatedOpacity(
                opacity: _cover ? 1 : 0,
                duration: const Duration(milliseconds: 350),
                child: const ColoredBox(color: _bg, child: SizedBox.expand()),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 72,
              child: IgnorePointer(
                child: AnimatedOpacity(
                  opacity: _exitHint ? 1 : 0,
                  duration: const Duration(milliseconds: 250),
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xE61B222B),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFF2E3A47)),
                      ),
                      child: const Text(
                        '한 번 더 누르면 게임이 꺼져요',
                        style: TextStyle(color: Color(0xFFEEF3EA), fontSize: 15, decoration: TextDecoration.none),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
