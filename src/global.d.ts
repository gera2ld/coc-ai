interface QueryContext {
  locale: string;
  alternateLocale: string;
  input: string;
  output: string;
}

interface PromptDefinition {
  name: string;
  command: string;
  model?: string;
  shortcut?: string;
  loadingTpl: string;
  promptTpl: string;
  resultTpl: string;
}
