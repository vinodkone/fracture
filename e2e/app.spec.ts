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

  test('should add an expense with shares split', async ({ page }) => {
    // Create a group
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill('Shares Split Group');
    await page.getByPlaceholder('Member 1 name').fill('Isaac');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Julia');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 3 name').fill('Kevin');
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Navigate to add expense
    await page.getByRole('link', { name: 'Add Expense' }).click();
    await page.waitForURL(/\/expenses\/new/);

    // Fill in expense details
    await page.getByLabel('Description').fill('Group Dinner');
    await page.getByLabel('Amount ($)').fill('90');
    await page.getByLabel('Paid by').selectOption({ label: 'Isaac' });

    // Select shares split type
    await page.getByLabel('Split type').selectOption('shares');

    // Set different shares (Isaac: 2, Julia: 1, Kevin: 3)
    const shareInputs = page.locator('input[type="number"][min="0"]');
    await shareInputs.nth(0).fill('2');
    await shareInputs.nth(1).fill('1');
    await shareInputs.nth(2).fill('3');

    // Submit
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Verify expense appears
    await page.waitForURL(/\/groups\/[a-f0-9-]+$/);
    await expect(page.getByText('Group Dinner')).toBeVisible();
    await expect(page.getByText('$90.00')).toBeVisible();
    await expect(page.getByText('By shares')).toBeVisible();
  });

  test('should add an expense with percentage split', async ({ page }) => {
    // Create a group
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill('Percentage Split Group');
    await page.getByPlaceholder('Member 1 name').fill('Laura');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Mike');
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Navigate to add expense
    await page.getByRole('link', { name: 'Add Expense' }).click();
    await page.waitForURL(/\/expenses\/new/);

    // Fill in expense details
    await page.getByLabel('Description').fill('Hotel Room');
    await page.getByLabel('Amount ($)').fill('200');
    await page.getByLabel('Paid by').selectOption({ label: 'Laura' });

    // Select percentage split type
    await page.getByLabel('Split type').selectOption('percentage');

    // Set percentages (Laura: 70%, Mike: 30%)
    const percentInputs = page.locator('input[type="number"][min="0"]');
    await percentInputs.nth(0).fill('70');
    await percentInputs.nth(1).fill('30');

    // Verify percentage indicator shows 100%
    await expect(page.getByText('(Total: 100%)')).toBeVisible();

    // Submit
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Verify expense appears
    await page.waitForURL(/\/groups\/[a-f0-9-]+$/);
    await expect(page.getByText('Hotel Room')).toBeVisible();
    await expect(page.getByText('$200.00')).toBeVisible();
    await expect(page.getByText('By percentage')).toBeVisible();
  });

  test('should show error when percentages do not add up to 100', async ({ page }) => {
    // Create a group
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill('Invalid Percentage Group');
    await page.getByPlaceholder('Member 1 name').fill('Nancy');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Oscar');
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Navigate to add expense
    await page.getByRole('link', { name: 'Add Expense' }).click();
    await page.waitForURL(/\/expenses\/new/);

    // Fill in expense details
    await page.getByLabel('Description').fill('Invalid Split');
    await page.getByLabel('Amount ($)').fill('100');
    await page.getByLabel('Paid by').selectOption({ label: 'Nancy' });

    // Select percentage split type
    await page.getByLabel('Split type').selectOption('percentage');

    // Set invalid percentages (Nancy: 60%, Oscar: 30% = 90%)
    const percentInputs = page.locator('input[type="number"][min="0"]');
    await percentInputs.nth(0).fill('60');
    await percentInputs.nth(1).fill('30');

    // Submit
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Verify error message
    await expect(page.getByText(/Percentages must add up to 100%/)).toBeVisible();
  });

  test('should edit an existing expense', async ({ page }) => {
    // Create a group
    await page.goto('/groups/new');
    await page.getByLabel('Group Name').fill('Edit Expense Group');
    await page.getByPlaceholder('Member 1 name').fill('Peter');
    await page.getByRole('button', { name: '+ Add Member' }).click();
    await page.getByPlaceholder('Member 2 name').fill('Quinn');
    await page.getByRole('button', { name: 'Create Group' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/);

    // Add an expense
    await page.getByRole('link', { name: 'Add Expense' }).click();
    await page.getByLabel('Description').fill('Original Expense');
    await page.getByLabel('Amount ($)').fill('50');
    await page.getByLabel('Paid by').selectOption({ label: 'Peter' });
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+$/);

    // Click edit on the expense
    await page.getByRole('link', { name: 'Edit' }).click();
    await page.waitForURL(/\/expenses\/[a-f0-9-]+\/edit/);

    // Update the expense
    await page.getByLabel('Description').fill('Updated Expense');
    await page.getByLabel('Amount ($)').fill('75');
    await page.getByRole('button', { name: 'Update Expense' }).click();

    // Verify updated expense appears
    await page.waitForURL(/\/groups\/[a-f0-9-]+$/);
    await expect(page.getByText('Updated Expense')).toBeVisible();
    await expect(page.getByText('$75.00')).toBeVisible();
  });
});
