import { faker } from '@faker-js/faker';

export interface TestUser {
  email: string;
  password: string;
}

/**
 * Generate a unique test user with strong password
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  const randomString = faker.string.alphanumeric(6);

  return {
    email: `test-${timestamp}-${randomString}@example.com`,
    password: faker.internet.password({
      length: 12,
      memorable: false,
      pattern: /[a-zA-Z0-9!@#$%^&*]/,
    }) + 'A1!', // Ensure it meets all requirements
  };
}

/**
 * Generate a weak password for testing validation
 */
export function generateWeakPassword(): string {
  return 'weak';
}

/**
 * Generate passwords with specific missing requirements
 */
export const InvalidPasswords = {
  tooShort: 'Pass1!',
  noUppercase: 'password123!',
  noLowercase: 'PASSWORD123!',
  noNumber: 'Password!',
  noSymbol: 'Password123',
  onlyNumbers: '12345678',
  onlyLetters: 'abcdefgh',
};
