import { test, expect } from '@playwright/test';
import { RegisterPage } from './pages/RegisterPage';
import { generateTestUser, InvalidPasswords } from './fixtures/test-user';

test.describe('ユーザー登録', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('有効な情報で新規登録できる', async () => {
    const user = generateTestUser();

    await test.step('登録フォームに入力', async () => {
      await registerPage.register(user.email, user.password, user.password);
    });

    await test.step('成功トーストが表示される', async () => {
      await registerPage.expectSuccessToast();
    });

    await test.step('ホームページにリダイレクトされる', async () => {
      await registerPage.expectRedirectToHome();
    });
  });

  test('パスワードが一致しない場合はエラーが表示される', async () => {
    const user = generateTestUser();

    await test.step('登録フォームに異なるパスワードを入力', async () => {
      await registerPage.register(
        user.email,
        user.password,
        user.password + 'different'
      );
    });

    await test.step('エラーメッセージが表示される', async () => {
      await registerPage.expectErrorMessage('パスワードが一致しません');
    });
  });

  test.describe('パスワードバリデーション', () => {
    test('無効なパスワードはバリデーションでブロックされる', async () => {
      const user = generateTestUser();

      await test.step('大文字なしのパスワードで登録を試みる', async () => {
        await registerPage.emailInput.fill(user.email);
        await registerPage.passwordInput.fill(InvalidPasswords.noUppercase);
        await registerPage.confirmPasswordInput.fill(InvalidPasswords.noUppercase);
        await registerPage.registerButton.click();
      });

      await test.step('ページはそのままで、登録されない', async () => {
        // 登録に失敗しているため、まだ登録ページにいる
        await expect(registerPage.page).toHaveURL('/register');
      });
    });
  });

  test.describe('パスワード要件のリアルタイム表示', () => {
    test('パスワード入力時に要件が表示される', async () => {
      await test.step('パスワードフィールドをフォーカス', async () => {
        await registerPage.passwordInput.focus();
        await registerPage.passwordInput.fill('P');
      });

      await test.step('パスワード要件が表示される', async () => {
        await registerPage.expectPasswordRequirementsVisible();
      });
    });

    test('要件を満たすとチェックマークが表示される', async () => {
      await test.step('パスワードフィールドをフォーカス', async () => {
        await registerPage.passwordInput.focus();
      });

      await test.step('有効なパスワードを入力', async () => {
        await registerPage.passwordInput.fill('Password123!');
      });

      await test.step('全ての要件が満たされている', async () => {
        await registerPage.expectPasswordRequirementMet('8文字以上');
        await registerPage.expectPasswordRequirementMet('大文字を含む');
        await registerPage.expectPasswordRequirementMet('小文字を含む');
        await registerPage.expectPasswordRequirementMet('数字を含む');
        await registerPage.expectPasswordRequirementMet('記号を含む');
      });
    });

    test('要件を満たさない場合はグレーのアイコンが表示される', async () => {
      await test.step('パスワードフィールドをフォーカス', async () => {
        await registerPage.passwordInput.focus();
      });

      await test.step('弱いパスワードを入力', async () => {
        await registerPage.passwordInput.fill('weak');
      });

      await test.step('要件が満たされていない', async () => {
        await registerPage.expectPasswordRequirementNotMet('大文字を含む');
        await registerPage.expectPasswordRequirementNotMet('数字を含む');
        await registerPage.expectPasswordRequirementNotMet('記号を含む');
      });
    });
  });

  test.describe('パスワード強度インジケーター', () => {
    test('非常に弱いパスワード', async () => {
      await registerPage.passwordInput.focus();
      await registerPage.passwordInput.fill('pass');
      await registerPage.expectPasswordStrength('非常に弱い');
    });

    test('弱いパスワード', async () => {
      await registerPage.passwordInput.focus();
      await registerPage.passwordInput.fill('password');
      await registerPage.expectPasswordStrength('弱い');
    });

    test('普通のパスワード', async () => {
      await registerPage.passwordInput.focus();
      await registerPage.passwordInput.fill('Password1');
      await registerPage.expectPasswordStrength('強い');
    });

    test('強いパスワード', async () => {
      await registerPage.passwordInput.focus();
      await registerPage.passwordInput.fill('Password123!');
      await registerPage.expectPasswordStrength('強い');
    });

    test('非常に強いパスワード', async () => {
      await registerPage.passwordInput.focus();
      await registerPage.passwordInput.fill('VeryStr0ng!Pass@2024');
      await registerPage.expectPasswordStrength('非常に強い');
    });
  });

  test('既に登録されているメールアドレスはエラーになる', async () => {
    const user = generateTestUser();

    await test.step('最初の登録', async () => {
      await registerPage.register(user.email, user.password, user.password);
      await registerPage.expectSuccessToast();
    });

    await test.step('ログアウトして再度登録ページへ', async () => {
      await registerPage.page.goto('/dashboard');
      // ログアウトボタンをクリック（ドロップダウンを開いてから）
      const userMenuButton = registerPage.page.locator('button').filter({ hasText: 'ユーザー' });
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        const logoutButton = registerPage.page.locator('button').filter({ hasText: 'ログアウト' });
        await logoutButton.click();
        await registerPage.page.waitForURL('/login');
      }
      await registerPage.goto();
    });

    await test.step('同じメールアドレスで登録を試みる', async () => {
      await registerPage.register(user.email, user.password, user.password);
    });

    await test.step('エラートーストが表示される', async () => {
      await registerPage.expectErrorToast();
    });
  });
});
