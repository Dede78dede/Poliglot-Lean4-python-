import type { FixturePage } from './command-palette.fixture';

export class MenuBarFixture {
  constructor(private readonly page: FixturePage) {}

  public async getMenuBar() {
    return this.page.getByRole('menubar', { name: /application main menu/i });
  }

  public async openMenu(menuLabel: string): Promise<void> {
    const button = this.page.getByRole('button', { name: new RegExp(menuLabel, 'i') });
    await button.click();
  }

  public async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  public async closeMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}
