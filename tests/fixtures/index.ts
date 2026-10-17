import { CommandPaletteFixture, type FixturePage } from './command-palette.fixture';
import { MenuBarFixture } from './menu-bar.fixture';

export { CommandPaletteFixture, MenuBarFixture, type FixturePage };

export interface NavigationFixtures {
  commandPalette: CommandPaletteFixture;
  menuBar: MenuBarFixture;
  page: FixturePage;
}

export type FixtureCallback = (fixtures: NavigationFixtures) => Promise<void>;

/**
 * Fixture runner wrapping page and lazily instantiating commandPalette & menuBar fixtures.
 */
export async function runWithFixtures(
  page: FixturePage,
  fn: (fixtures: { commandPalette: CommandPaletteFixture; menuBar: MenuBarFixture; page: FixturePage }) => Promise<void>
): Promise<void> {
  const commandPalette = new CommandPaletteFixture(page);
  const menuBar = new MenuBarFixture(page);
  await fn({ commandPalette, menuBar, page });
}
