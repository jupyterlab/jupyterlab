import SystemFonts from 'system-font-families';

const systemFonts = new SystemFonts();

export function getFontFamilies(): Promise<string[]> {
  return systemFonts.getFonts();
}

export function getFontFamiliesSync(): string[] {
  return systemFonts.getFontsSync();
}
