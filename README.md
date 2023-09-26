# 주유월 사서함

[주유월 사서함](https://ask.yuwol.pe.kr/)의 소스 코드 공개용 저장소. 데이터, 외부/개인적 애셋을 제외한 코드를 공개한다.

## 특징

불특정 다수에게 익명 메시지를 제출받고, 그 답장을 게시하는 개인용 웹사이트 프로젝트.

메시지 텍스트가 이미지로 생성되어 트위터에서 링크를 공유할 때 [Peing](https://peing.net/), [스핀스핀](https://www.spinspin.net/) 외 유사 서비스처럼 큰 이미지 섬네일이 뜬다.

Peing과 달리, 이미지에서 이모지 지원이 된다.

## 동작

[Vercel](https://vercel.com/) 플랫폼 기반으로, [GitHub](https://github.com/)과 [Resend](https://resend.com/)의 REST API를 사용한다. 전부 무료 플랜이 제공되는 서비스로, 사용량이 너무 많지 않은 이상 무료로 운영 가능하다.

- 정적 페이지 빌드: Node.js - [Eta 템플릿 엔진](https://eta.js.org/) 사용
- 백엔드: Vercel 서버리스/Edge 함수 - Node.js 런타임
- 데이터베이스: Vercel KV
- 이메일 알림: Resend

사용자로부터 메시지가 제출되면, 서버리스 함수가 그것을 Vercel KV 데이터베이스에 저장한다. 이때 Resend REST API를 사용해 관리자에게 이메일 알림도 보낸다.

관리자는 그렇게 저장된 메시지 목록을 관리자 페이지에서 확인하고, 그에 대한 답글을 작성할 수 있다. 메시지의 삭제, 답글의 수정/삭제도 가능하다.

관리자가 답글을 제출하면, 서버리스 함수는 GitHub 저장소에 메시지와 답글이 들어간 JSON 데이터 파일을 추가한다. 이때 메시지 텍스트를 이미지로 만들어서 함께 커밋한다.

그렇게 새 커밋이 생성되면 Vercel이 이를 자동으로 수신해서 사이트 전체를 재빌드한다. 그렇게 개별 메시지/답글 페이지와 목록 페이지, 그외 여러 페이지가 정적으로 생성된다.

참고로 Vercel Hobby 플랜(무료)의 하루(24시간) 빌드 가능 횟수는 100회, Resend 무료 플랜의 하루 발송 가능 횟수는 100회다. 무료로 운영하는 동안 하루에 대충 100번까지 메시지를 받고 답장하는 게 가능한 것이다. 반대로 말하면 그 이상부터는 유지비가 든다.

단점은 답글을 제출하고 사이트가 빌드되기까지 딜레이가 좀 걸린다는 것. 약 960-970개의 데이터가 있을 때 빌드 속도는 20-25초 정도였다.

## 디렉토리/파일

- [api/](api/): Vercel 서버리스/Edge 함수 디렉토리
  - [delete.js](api/delete.js): 답글이 달리지 않은 메시지 혹은 이미 발행된 메시지/답글을 삭제하는 앱 (관리자용)
  - [message.js](api/message.js): 사용자로부터 메시지를 제출받는 앱
  - [modify.js](api/modify.js): 이미 작성된 답글을 수정하는 앱 (관리자용)
  - [reply.js](api/reply.js): 답글이 달리지 않은 메시지에 답글을 다는 앱 (관리자용)
  - [unreplied.js](api/unreplied.js): 답글이 달리지 않은 메시지 목록을 가져오는 앱 (관리자용)
- data/: 데이터 디렉토리
- [image/](image/): 이미지 생성 스크립트/애셋 디렉토리
  - [fonts/](image/fonts/): 폰트(이미지 생성에 쓰이는) 디렉토리
  - [image-builder.js](image/image-builder.js): 이미지 생성 스크립트
- [public/](public/): 사이트 출력 디렉토리
  - [assets/](public/assets/): CSS/JavaScript 디렉토리
    - [default.css](public/assets/default.css): 기본 스타일시트
    - [search.css](public/assets/search.css): 검색 페이지 스타일시트
    - [message.js](public/assets/message.js): 메시지 이중 제출 방지 & 이미지 토글 스크립트
    - [search.js](public/assets/search.js): 클라이언트 사이드 검색 앱
  - images/: 이미지(메시지 텍스트로부터 생성된) 디렉토리
  - [mailbox/](public/mailbox/): 관리자 디렉토리
    - [admin.css](public/mailbox/admin.css): 관리자 페이지 스타일시트
    - [admin.js](public/mailbox/admin.js): 관리자 페이지 앱
- [templates/](templates/): Eta 템플릿 디렉토리. 파일명이 곧 용처이므로 파일별 설명은 생략.
- [build.js](build.js): 사이트 빌드 스크립트
- [build-images.js](build-images.js): 이미지 전체 빌드 스크립트 (개발용)
- [config.js](config.js): 설정 파일
- [middleware.js](middleware.js): Vercel 미들웨어 함수
- [vercel.json](vercel.json): Vercel 설정 파일

## 데이터 파일

메시지와 그에 대한 답글의 쌍이 하나의 데이터 파일이 된다. 데이터 파일은 JSON 형식으로, 데이터 디렉토리('data/')에 위치한다.

데이터 파일 예시:

``` json
{
  "id": "ld7la5u60",
  "messageDate": "2023-01-23T01:23:45.678+09:00",
  "message": "헬로, 유월!",
  "replyDate": "2023-01-23T12:34:56.789+09:00",
  "reply": "헬로, 익명!"
}
```

- `id`: 고유 식별자. `messageDate` 값의 밀리초 단위 Epoch 타임스탬프의 36진수 + 겹침 방지용 36진수 카운터 형식의 문자열.
- `messageDate`: 메시지 작성 시각. 연도가 4자리인 ISO 8601 형식의 문자열. 시간 포함 여부는 선택 사항.
- `message`: 메시지 문자열.
- `replyDate`: 답글 작성 시각. `messageDate`와 동일 형식.
- `reply`: 답글 문자열.

모든 데이터 파일의 파일명은 id + '.json' 형식이어야 한다. 고유 식별자가 'ld7la5u60'이면 파일명이 'ld7la5u60.json'인 식. 이는 GitHub REST API로 저장소의 데이터에 접근하기 위해 필수적인 부분이다.

## 'config.js' 파일

[config.js](config.js) 파일이 내보내는 객체는 사이트의 각종 설정을 담당한다.

- `perPage`: 메시지/답글 목록, 검색 결과, 관리자 페이지 등에서 한 페이지에 한 번에 표시될 글의 수. 정수.
- `messageMaxLength`: 받을 메시지의 최대 글자수. 정수.
- `origin`: 사이트의 URL Origin. Vercel은 HTTPS가 강제되므로 'https://' + 도메인 형태가 된다.
- `email`:
  - `from`: 이메일 알림의 발신 이메일 주소. Resend에서 따로 본인 소유의 도메인으로 도메인 설정을 하지 않는다면 'onboarding@resend.dev' 이외의 것으로 설정할 수 없다.
  - `to`: 이메일 알림의 수신 이메일 주소 = 내 이메일.
- `fontFiles`: 문자열의 배열. 빌드될 이미지의 폰트를 결정한다. 상세는 '이미지 생성' 섹션에서 후술.
- `siteTitle`: 사이트 이름. 페이지 템플릿에서만이 아니라 이메일 알림에서 발신자명으로도 사용된다.
- `description`: 사이트 설명. 페이지 템플릿에서만 사용된다. 이런 식으로 템플릿에서 전역변수로서 사용하기 위해 필드를 추가해도 된다.

객체의 모든 필드는 페이지 템플릿에서 호출할 수 있다.

## 이미지 생성

[Skia의 CanvasKit](https://www.npmjs.com/package/canvaskit-wasm) 라이브러리를 사용한다. [image/image-builder.js](image/image-builder.js) 파일이 이미지 생성을 하는 스크립트다.

본 저장소에는 폰트 파일이 빠져 있지만, 폰트를 넣지 않으면 CanvasKit은 텍스트를 렌더링하지 못한다. 이미지 생성 스크립트 또한 폰트가 없는 경우를 상정하지 않고 작성되었다.

폰트는 'image' 디렉토리 하위에 'font' 디렉토리를 생성해서 폰트 파일들을 위치시키고, 'config.js' 객체의 `fontFiles` 필드에 파일명들을 배열 형태로 기입하여 설정한다. 먼저 오는 폰트일수록 글리프 우선순위가 높다. 가령 값이 `['A.woff', 'B.ttf']`고, A와 B 폰트 모두 'a' 문자에 대한 글리프를 갖고 있다면, 이미지에 출력되는 'a' 문자는 A 폰트의 글리프다.

이모지를 표시하려면 이모지 폰트를 사용해야 한다. 나는 Mozilla의 [twemoji-colr](https://github.com/mozilla/twemoji-colr) 프로젝트에서 배포하는 TTF 파일을 사용했다. 참고로 이건 트위터의 이모지를 폰트화시킨 것이다.

이미지 형식을 변경하려면, (혼자 쓸 걸 상정하고 만든 거라 딱히 매개변수를 설정하는 친절한 기능은 굳이 만들지 않았기 때문에...) 이미지 생성 스크립트의 코드 안에서 변수 값을 직접 변경해야 한다. 딱히 주석을 달아놓지는 않았지만 변수명 = 하는 일이라서 그렇게 반직관적이지는 않다.

CanvasKit을 다루려면 [Node.js용 예시 코드](https://github.com/google/skia/blob/main/modules/canvaskit/npm_build/node.example.js)와 [Typescript 함수 정의](https://github.com/google/skia/blob/main/modules/canvaskit/npm_build/types/index.d.ts), 그리고 Skia 홈페이지의 [Quickstart 페이지](https://skia.org/docs/user/modules/quickstart/)를 참조할 수 있다.

## Vercel 설정

서버리스/Edge 함수 응답을 포함한 모든 HTTP 헤더 설정은 [vercel.json](vercel.json) 파일에서 일괄적으로 관리한다.

[middleware.js](middleware.js) 파일은 관리자 디렉토리('/mailbox/')에 Basic 인증을 설정한다. 빌드된 에러 페이지와 Vercel 함수의 원 경로('/api/:path')에 대한 접근을 막고 404를 띄우는 일도 한다. '/api/:path'에 대한 접근을 막아야 하는 이유는 인증이 '/mailbox/' 경로에 걸려있기 때문에 '/api/:path'로 접근하면 인증 없이 관리자용 앱에 액세스할 수 있게 되기 때문이다.

데이터베이스로서 Vercel KV를 사용하므로 프로젝트에 Vercel KV 스토리지 연결이 요구된다. Vercel 대시보드 > (프로젝트) > Storage에서 설정한다.

### 환경 변수

- `ADMIN_ID`: 관리자 아이디
- `ADMIN_PASSWORD`: 관리자 암호
- `GITHUB_TOKEN`: GitHub Personal Access Token (Classic) - repo 권한 체크
- `RESEND_KEY`: Resend API 키

## FAQ

- 이 소스로 저만의 익명 메시지 응모 사이트를 만들고 싶습니다. 가능한가요?
  - 네, 그러라고 오픈소스로 풀었습니다. 하지만 사용하실 때 코드에 있는 제 사적인 정보들은 반드시 지워주세요. [config.js](config.js), [templates/layouts/defualt.eta](templates/layouts/defualt.eta), [templates/home.eta](templates/home.eta)을 수정해 주시면 됩니다.
- 이 소스를 수정해서 제 사이트를 만들고 있는데, 어려움이 생겼습니다. 도와주실 수 있나요?
  - 네, 질문은 환영합니다! 제 [트위터(@JuYuwol)](https://twitter.com/JuYuwol)나 [사서함](https://ask.yuwol.pe.kr/)으로 와 주세요. 하지만 하다가 중간에 막힌 게 아니라, 구체적으로 어떻게 시작해야 할지 전혀 모르겠는 거라면, 유지관리에 필요한 기본 지식이 부족하다는 뜻이기 때문에 그냥 페잉 등을 사용하시는 게 최선입니다.
- 전혀 모르겠지만 (여러 필사적인 사정으로) 그래도 갖고 싶습니다. 대신 설치해 주실 수 있나요?
  - 제 [홈페이지 커미션](https://commission.yuwol.pe.kr/)을 이용해 주시면 매우 감사합니다. ☺

## 라이선스

[MIT](LICENSE.txt)
