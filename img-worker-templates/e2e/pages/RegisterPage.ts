import { Page, Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;
  readonly toast: Locator;
  readonly passwordRequirements: Locator;
  readonly passwordStrengthIndicator: Locator;
  readonly passwordStrengthLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.registerButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a[href="/login"]');
    this.errorMessage = page.locator('.bg-red-50');
    this.toast = page.locator('[data-sonner-toast]');
    this.passwordRequirements = page.locator('.bg-gray-50.rounded-md.border');
    this.passwordStrengthIndicator = page.locator('.bg-gray-200.rounded-full.h-2');
    this.passwordStrengthLabel = page.locator('text=パスワード強度:').locator('..').locator('span').nth(1);
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(email: string, password: string, confirmPassword: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.registerButton.click();
  }

  async expectPasswordRequirementsVisible() {
    await expect(this.passwordRequirements).toBeVisible();
  }

  async expectPasswordRequirementMet(requirement: string) {
    const requirementRow = this.page.locator(`text=${requirement}`).locator('..');
    await expect(requirementRow.locator('.text-green-600')).toBeVisible();
  }

  async expectPasswordRequirementNotMet(requirement: string) {
    const requirementRow = this.page.locator(`text=${requirement}`).locator('..');
    await expect(requirementRow.locator('.text-gray-400')).toBeVisible();
  }

  async expectPasswordStrength(strength: string) {
    await expect(this.passwordStrengthLabel).toContainText(strength);
  }

  async expectErrorMessage(message: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectSuccessToast() {
    await expect(this.toast).toBeVisible();
    await expect(this.toast).toContainText('アカウントを作成しました');
  }

  async expectErrorToast() {
    await expect(this.toast).toBeVisible();
    await expect(this.toast).toContainText(/登録に失敗しました|エラー|既に登録されています/i);
  }

  async expectRedirectToHome() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
