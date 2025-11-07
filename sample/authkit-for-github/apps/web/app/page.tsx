import Link from 'next/link';

export default async function Home() {
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold mb-4">AuthKit Demo</h1>
        <div className="space-x-4">
          <Link className="underline" href="/(auth)/login">ログイン</Link>
          <Link className="underline" href="/(auth)/register">新規登録</Link>
          <Link className="underline" href="/settings/account">設定</Link>
        </div>
      </div>
    </main>
  );
}
