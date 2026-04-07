export async function tuiCommand(): Promise<void> {
  // Dynamic import to avoid loading ink/react when not needed
  const { render } = await import("ink");
  const { createElement } = await import("react");
  const { default: App } = await import("../../tui/App.js");
  render(createElement(App));
}
