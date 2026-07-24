// The app always renders the dark theme (see src/app/layout.tsx), so chart
// components always use the dark chart palette.
export function useIsDarkMode(): boolean {
  return true;
}
