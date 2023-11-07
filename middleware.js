import { next, rewrite } from '@vercel/edge';

export const config = {
  matcher: [
    '/api/:path*',
    '/mailbox/:path*',
    '/400.html',
    '/404.html',
    '/405.html',
    '/500.html'
  ],
};

export default async function middleware(req) {
  if (new URL(req.url).pathname.startsWith('/mailbox/')) {
    try {
      const auth = req.headers.get('authorization');
      if (!auth || !auth.startsWith('Basic ')) {
        throw new Error();
      }
      const cred = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
      if (cred !== `${process.env.ADMIN_ID}:${process.env.ADMIN_PASSWORD}`) {
        throw new Error();
      }
      return next();
    } catch (e) {
      return new Response(null, {
        status: 401,
        headers: { 'www-authenticate': 'Basic relm="Admin"' },
      });
    }
  } else {
    return rewrite('/404.html', { status: 404 });
  }
}
