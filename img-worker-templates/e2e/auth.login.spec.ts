import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { generateTestUser } from './fixtures/test-user';

test.describe('ログイン', () => {
  let loginPage: LoginPage;
  let testUser: ReturnType<typeof generateTestUser>;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    testUser = generateTestUser();

    // テストユーザーを事前に登録
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(
      testUser.email,
      testUser.password,
      testUser.password
    );
    await expect(page).toHaveURL('/dashboard');

    // ログアウト（ドロップダウンを開いてからクリック）
    const userMenuButton = page.locator('button').filter({ hasText: 'ユーザー' });
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
      const logoutButton = page.locator('button').filter({ hasText: 'ログアウト' });
      await logoutButton.click();
      await page.waitForURL(/\/login/);
    } else {
      await loginPage.goto();
    }
  });

  test('有効な認証情報でログインできる', async () => {
    await test.step('ログインフォームに入力', async () => {
      await loginPage.login(testUser.email, testUser.password);
    });

    await test.step('成功トーストが表示される', async () => {
      await loginPage.expectSuccessToast();
    });

    await test.step('ホームページにリダイレクトされる', async () => {
      await loginPage.expectRedirectToDashboard();
    });
  });

  test('無効なメールアドレスでログイン失敗', async () => {
    await test.step('存在しないメールアドレスでログイン', async () => {
      await loginPage.login('nonexistent@example.com', testUser.password);
    });

    await test.step('エラートーストが表示される', async () => {
      await loginPage.expectErrorToast();
    });

    await test.step('ログインページに留まる', async () => {
      await expect(loginPage.page).toHaveURL(/\/login/);
    });
  });

  test('無効なパスワードでログイン失敗', async () => {
    await test.step('間違ったパスワードでログイン', async () => {
      await loginPage.login(testUser.email, 'WrongPassword123!');
    });

    await test.step('エラートーストが表示される', async () => {
      await loginPage.expectErrorToast();
    });

    await test.step('ログインページに留まる', async () => {
      await expect(loginPage.page).toHaveURL(/\/login/);
    });
  });

  test('空のフィールドでログイン失敗', async () => {
    await test.step('空のフォームで送信', async () => {
      await loginPage.loginButton.click();
    });

    await test.step('ログインページに留まる', async () => {
      await expect(loginPage.page).toHaveURL(/\/login/);
    });
  });

  test('登録ページへのリンクが機能する', async () => {
    await test.step('登録リンクをクリック', async () => {
      await loginPage.registerLink.click();
    });

    await test.step('登録ページにリダイレクトされる', async () => {
      await expect(loginPage.page).toHaveURL('/register');
    });
  });
});
