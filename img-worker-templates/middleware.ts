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

  // セッションCookieをチェック
  const sessionCookie = request.cookies.get('__session');

  // 保護されたパスへのアクセス
  if (protectedPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    if (!sessionCookie) {
      // セッションがない場合、ログインページにリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // セッションがある場合、Workers APIでセッションを検証
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
        // セッションが無効な場合、ログインページにリダイレクト
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);

        // Cookieを削除
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.delete('__session');
        return redirectResponse;
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // エラーの場合もログインページにリダイレクト
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 認証ページへのアクセス（ログイン済みの場合）
  if (authPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
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
