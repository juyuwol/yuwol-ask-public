export const vercel = {
  "buildCommand": "node scripts/build.js",
  "outputDirectory": "public",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "cache-control", "value": "max-age=86400" }
      ]
    },
    {
      "source": "/(.*).png",
      "headers": [
        { "key": "cache-control", "value": "max-age=2592000, immutable" }
      ]
    },
    {
      "source": "/(lists/.*|search/data.json)",
      "headers": [
        { "key": "cache-control", "value": "max-age=180" }
      ]
    },
    {
      "source": "/favicon.ico",
      "headers": [
        { "key": "cache-control", "value": "max-age=2592000, immutable" },
        { "key": "content-type", "value": "image/png" }
      ]
    },
    {
      "source": "/mailbox/(replied|unreplied).json",
      "headers": [
        { "key": "cache-control", "value": "no-cache, must-revalidate" }
      ]
    },
    {
      "source": "/(mailbox/delete|mailbox/modify|mailbox/reply|submit)",
      "headers": [
        { "key": "cache-control", "value": "no-store" }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/(lists|posts)/",
      "destination": "/lists/1.html",
      "statusCode": 301
    }
  ],
  "rewrites": [
    {
      "source": "/submit",
      "destination": "/api/message.js"
    },
    {
      "source": "/mailbox/unreplied.json",
      "destination": "/api/unreplied.js"
    },
    {
      "source": "/mailbox/:path(delete|modify|reply)",
      "destination": "/api/:path.js"
    },
    {
      "source": "/images/proxy/:id*",
      "destination": "https://static.yuwol.pe.kr/ask/images/:id*"
    }
  ],
  "functions": {
    "api/reply.js": {
      "includeFiles": "node_modules/canvaskit-wasm/bin/canvaskit.wasm"
    }
  }
}
