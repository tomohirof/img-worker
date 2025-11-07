import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { generateTestUser } from './fixtures/test-user';

test.describe('認証セッション', () => {
  let testUser: ReturnType<typeof generateTestUser>;

  test.beforeEach(async ({ page }) => {
    testUser = generateTestUser();

    // テストユーザーを登録してログイン状態にする
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(
      testUser.email,
      testUser.password,
      testUser.password
    );
    await expect(page).toHaveURL('/dashboard');
  });

  test('ログイン後、ページをリロードしてもログイン状態が維持される', async ({
    page,
  }) => {
    await test.step('ダッシュボードページにいることを確認', async () => {
      await expect(page).toHaveURL('/dashboard');
    });

    await test.step('ページをリロード', async () => {
      await page.reload();
    });

    await test.step('ログイン状態が維持されている', async () => {
      await expect(page).toHaveURL('/dashboard');
      // ユーザーメニューが表示されていることを確認（ログイン状態の証明）
      await expect(page.locator('button').filter({ hasText: 'ユーザー' })).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test('ログアウトするとログインページにリダイレクトされる', async ({
    page,
  }) => {
    await test.step('ログアウトボタンをクリック', async () => {
      const userMenuButton = page.locator('button').filter({ hasText: 'ユーザー' });
      await expect(userMenuButton).toBeVisible({ timeout: 10000 });
      await userMenuButton.click();
      const logoutButton = page.locator('button').filter({ hasText: 'ログアウト' });
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();
    });

    await test.step('ログアウト成功トーストが表示される', async () => {
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('ログアウトしました');
    });

    await test.step('ログインページにリダイレクトされる', async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test('ログアウト後、保護されたページにアクセスできない', async ({
    page,
  }) => {
    await test.step('ログアウト', async () => {
      const userMenuButton = page.locator('button').filter({ hasText: 'ユーザー' });
      await expect(userMenuButton).toBeVisible({ timeout: 10000 });
      await userMenuButton.click();
      const logoutButton = page.locator('button').filter({ hasText: 'ログアウト' });
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();
      await page.waitForURL(/\/login/);
    });

    await test.step('ホームページにアクセスを試みる', async () => {
      await page.goto('/');
    });

    await test.step('ログインページにリダイレクトされる', async () => {
      // 認証が必要なページは、未認証の場合ログインページにリダイレクトされる想定
      // または、ホームページがパブリックであれば、ログインボタンが表示される
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes('/login');
      const hasLoginButton = await page
        .locator('a[href="/login"]')
        .isVisible();

      expect(isLoginPage || hasLoginButton).toBeTruthy();
    });
  });

  test('別のブラウザコンテキストではログイン状態が共有されない', async ({
    browser,
    page,
  }) => {
    await test.step('最初のコンテキストでログイン状態を確認', async () => {
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('button').filter({ hasText: 'ユーザー' })).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step('新しいブラウザコンテキストを作成', async () => {
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();

      await newPage.goto('/');

      // 新しいコンテキストでは認証されていない
      const currentUrl = newPage.url();
      const isLoginPage = currentUrl.includes('/login');
      const hasLoginButton = await newPage.locator('a[href="/login"]').isVisible();

      expect(isLoginPage || hasLoginButton).toBeTruthy();

      await newContext.close();
    });
  });

  test('localStorageにトークンが保存される', async ({ page }) => {
    await test.step('localStorageにセッショントークンが存在する', async () => {
      const token = await page.evaluate(() => {
        return localStorage.getItem('__session');
      });

      expect(token).not.toBeNull();
      expect(token).toBeTruthy();
    });
  });

  test('ログアウト後、localStorageからトークンが削除される', async ({
    page,
  }) => {
    await test.step('ログアウト前にトークンが存在する', async () => {
      const token = await page.evaluate(() => {
        return localStorage.getItem('__session');
      });
      expect(token).not.toBeNull();
    });

    await test.step('ログアウト', async () => {
      const userMenuButton = page.locator('button').filter({ hasText: 'ユーザー' });
      await expect(userMenuButton).toBeVisible({ timeout: 10000 });
      await userMenuButton.click();
      const logoutButton = page.locator('button').filter({ hasText: 'ログアウト' });
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();
      await page.waitForURL(/\/login/);
    });

    await test.step('localStorageからトークンが削除される', async () => {
      const token = await page.evaluate(() => {
        return localStorage.getItem('__session');
      });
      expect(token).toBeNull();
    });
  });
});
