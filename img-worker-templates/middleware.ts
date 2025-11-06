import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証が必要なパス
const protectedPaths = ['/', '/templates', '/generate-test', '/api-docs', '/dashboard'];

// 認証ページ（ログイン済みユーザーがアクセスした場合にリダイレクト）
const authPaths = ['/login', '/register', '/reset-password', '/reset'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイルやNext.js内部パスはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 保護されたパスへのアクセス
  // ミドルウェアではCookieのみチェック（localStorageはクライアント側で確認）
  if (protectedPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    const sessionCookie = request.cookies.get('__session');

    // Cookieがある場合のみサーバー側で検証
    if (sessionCookie) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/session`,
          {
            headers: {
              Cookie: `__session=${sessionCookie.value}`,
            },
          }
        );

        if (!response.ok) {
          // セッションが無効な場合、Cookieを削除
          const nextResponse = NextResponse.next();
          nextResponse.cookies.delete('__session');
          return nextResponse;
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    }

    // Cookieがない場合は通過させる（クライアント側でlocalStorageをチェック）
  }

  // 認証ページへのアクセス（ログイン済みの場合）
  if (authPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    const sessionCookie = request.cookies.get('__session');
    if (sessionCookie) {
      // ログイン済みの場合、ダッシュボードにリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * すべてのパスにマッチ、ただし以下を除く:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
