import { test, expect } from '@playwright/test';

test.describe('Fracture App', () => {
  test('should display the groups page', async ({ page }) => {
    await page.goto('/groups');
    await expect(page.locator('h1')).toContainText('Groups');
  });

  test('should navigate to create group page', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('link', { name: 'Create Group' }).click();
    await expect(page).toHaveURL('/groups/new');
  });

  test('should create a new group with members', async ({ page }) => {
    await page.goto('/groups/new');

    // Fill in group name
    await page.getByLabel('Group Name').fill('Test Trip');

    // Fill in first member
    await page.getByPlaceholder('Member 1 name').fill('Alice');

    // Add second member
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Bob');

    // Submit the form
    await page.getByRole('button', { name: 'Create Group' }).click();

    // Wait for navigation to group detail page
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Verify we're on the group detail page
    await expect(page.locator('h1')).toContainText('Test Trip');
  });

  test('should add an expense to a group', async ({ page }) => {
    // Create a group first
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill('Expense Group');
    await page.getByPlaceholder('Member 1 name').fill('Charlie');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Diana');
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Navigate to add expense
    await page.getByRole('link', { name: 'Add Expense' }).click();
    await page.waitForURL(/\/expenses\/new/);

    // Fill in expense details
    await page.getByLabel('Description').fill('Lunch');
    await page.getByLabel('Amount ($)').fill('40');
    await page.getByLabel('Paid by').selectOption({ label: 'Charlie' });

    // Submit
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Verify expense appears
    await page.waitForURL(/\/groups\/[a-f0-9-]+$/);
    await expect(page.getByText('Lunch')).toBeVisible();
    await expect(page.getByText('$40.00')).toBeVisible();
  });

  test('should show balances and simplified debts', async ({ page }) => {
    // Create a group
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill('Balance Group');
    await page.getByPlaceholder('Member 1 name').fill('Eve');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Frank');
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Add an expense
    await page.getByRole('link', { name: 'Add Expense' }).click();
    await page.getByLabel('Description').fill('Movie tickets');
    await page.getByLabel('Amount ($)').fill('30');
    await page.getByLabel('Paid by').selectOption({ label: 'Eve' });
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+$/);

    // Verify balances are shown
    await expect(page.getByText('Member Balances')).toBeVisible();
    await expect(page.getByText('Simplified Settlements')).toBeVisible();
  });

  test('should navigate to settle page', async ({ page }) => {
    // Create a group
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill('Settle Group');
    await page.getByPlaceholder('Member 1 name').fill('George');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Hannah');
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Navigate to settle page
    await page.getByRole('link', { name: 'Settle Up' }).click();
    await expect(page).toHaveURL(/\/settle/);
    await expect(page.locator('h3')).toContainText('Settle Up');
  });
});
