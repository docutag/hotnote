import { test, expect } from '@playwright/test';

test.describe('File Picker Resize', () => {
  test('should have a resize handle', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="file-picker"]');

    // Resize handle should exist
    const resizeHandle = page.getByTestId('file-picker-resize-handle');
    await expect(resizeHandle).toBeAttached();
  });

  test('should show resize handle when file picker is visible', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible with welcome content
    await page.waitForSelector('.welcome-content');
    const filePicker = page.getByTestId('file-picker');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Both should be visible
    await expect(filePicker).not.toHaveClass(/hidden/);
    await expect(resizeHandle).not.toHaveClass(/hidden/);
  });

  test('should hide resize handle when file picker is hidden', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const filePicker = page.getByTestId('file-picker');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Initially both visible
    await expect(filePicker).not.toHaveClass(/hidden/);
    await expect(resizeHandle).not.toHaveClass(/hidden/);

    // Close the file picker by clicking outside
    const editor = page.getByTestId('editor');
    await editor.click();

    // Both should be hidden
    await expect(filePicker).toHaveClass(/hidden/);
    await expect(resizeHandle).toHaveClass(/hidden/);
  });

  test('should not close file picker when clicking on resize handle', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const filePicker = page.getByTestId('file-picker');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // File picker should be visible
    await expect(filePicker).not.toHaveClass(/hidden/);

    // Click on the resize handle
    await resizeHandle.click();

    // File picker should still be visible
    await expect(filePicker).not.toHaveClass(/hidden/);
  });

  test('should have ns-resize cursor on resize handle', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Check cursor style
    const cursor = await resizeHandle.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('ns-resize');
  });

  test('should resize file picker when dragging handle', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const filePicker = page.getByTestId('file-picker');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Get initial height
    const initialHeight = await filePicker.evaluate((el) => el.offsetHeight);

    // Get the bounding box of the resize handle
    const box = await resizeHandle.boundingBox();
    if (!box) throw new Error('Resize handle not found');

    // Drag the handle down by 100px
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 100);
    await page.mouse.up();

    // Wait for the resize to complete
    await page.waitForTimeout(100);

    // Get new height
    const newHeight = await filePicker.evaluate((el) => el.offsetHeight);

    // Height should have increased (approximately by 100px, allowing some tolerance)
    expect(newHeight).toBeGreaterThan(initialHeight + 80);
    expect(newHeight).toBeLessThan(initialHeight + 120);
  });

  test('should add dragging class during resize', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Initially should not have dragging class
    await expect(resizeHandle).not.toHaveClass(/dragging/);

    // Get the bounding box of the resize handle
    const box = await resizeHandle.boundingBox();
    if (!box) throw new Error('Resize handle not found');

    // Start dragging
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Should have dragging class while mouse is down
    await expect(resizeHandle).toHaveClass(/dragging/);

    // Release mouse
    await page.mouse.up();

    // Wait a bit for the class to be removed
    await page.waitForTimeout(50);

    // Should not have dragging class after release
    await expect(resizeHandle).not.toHaveClass(/dragging/);
  });

  test('should persist resize height in localStorage', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const filePicker = page.getByTestId('file-picker');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Get the bounding box of the resize handle
    const box = await resizeHandle.boundingBox();
    if (!box) throw new Error('Resize handle not found');

    // Drag the handle down by 150px
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 150);
    await page.mouse.up();

    // Wait for the resize to complete
    await page.waitForTimeout(100);

    // Get the height
    const height = await filePicker.evaluate((el) => el.offsetHeight);

    // Check localStorage
    const savedHeight = await page.evaluate(() => localStorage.getItem('filePickerHeight'));
    expect(parseInt(savedHeight, 10)).toBeCloseTo(height, 0);

    // Reload the page
    await page.reload();

    // Wait for file picker to be visible again
    await page.waitForSelector('.welcome-content');

    // Height should be restored from localStorage
    const restoredHeight = await filePicker.evaluate((el) => el.offsetHeight);
    expect(restoredHeight).toBeCloseTo(height, 0);
  });

  test('should enforce minimum height constraint', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const filePicker = page.getByTestId('file-picker');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Get the bounding box of the resize handle
    const box = await resizeHandle.boundingBox();
    if (!box) throw new Error('Resize handle not found');

    // Try to drag the handle up by a large amount (to force minimum)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 500);
    await page.mouse.up();

    // Wait for the resize to complete
    await page.waitForTimeout(100);

    // Get new height
    const height = await filePicker.evaluate((el) => el.offsetHeight);

    // Height should not be less than minimum (100px)
    expect(height).toBeGreaterThanOrEqual(100);
  });

  test('should enforce maximum height constraint', async ({ page }) => {
    await page.goto('/');

    // Wait for file picker to be visible
    await page.waitForSelector('.welcome-content');
    const filePicker = page.getByTestId('file-picker');
    const resizeHandle = page.getByTestId('file-picker-resize-handle');

    // Get the bounding box of the resize handle
    const box = await resizeHandle.boundingBox();
    if (!box) throw new Error('Resize handle not found');

    // Get viewport height to calculate max (80vh)
    const viewportHeight = page.viewportSize().height;
    const maxHeight = viewportHeight * 0.8;

    // Try to drag the handle down by a large amount (to force maximum)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 2000);
    await page.mouse.up();

    // Wait for the resize to complete
    await page.waitForTimeout(100);

    // Get new height
    const height = await filePicker.evaluate((el) => el.offsetHeight);

    // Height should not exceed maximum (80vh)
    expect(height).toBeLessThanOrEqual(maxHeight + 1); // +1 for rounding
  });
});
