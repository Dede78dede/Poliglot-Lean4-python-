export interface FixturePage {
  keyboard: {
    press(key: string): Promise<void>;
  };
  getByRole(
    role: string,
    options?: { name?: string | RegExp }
  ): {
    waitFor(): Promise<void>;
    isVisible(): Promise<boolean>;
    fill(text: string): Promise<void>;
    click(): Promise<void>;
    textContent(): Promise<string | null>;
  };
  locator(selector: string): {
    waitFor(): Promise<void>;
    isVisible(): Promise<boolean>;
    count(): Promise<number>;
    first(): { textContent(): Promise<string | null> };
  };
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
}

export class CommandPaletteFixture {
  constructor(private readonly page: FixturePage) {}

  public async open(): Promise<void> {
    await this.page.keyboard.press('Control+k');
    await this.page.getByRole('dialog', { name: /command palette/i }).waitFor();
  }

  public async type(query: string): Promise<void> {
    const input = this.page.getByRole('textbox', { name: /search/i });
    await input.fill(query);
  }

  public async executeFirst(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  public async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  public async isVisible(): Promise<boolean> {
    return this.page.getByRole('dialog', { name: /command palette/i }).isVisible();
  }
}
