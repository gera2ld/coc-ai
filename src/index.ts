import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ExtensionContext,
  Window,
  commands,
  window,
  workspace,
} from 'coc.nvim';

interface PromptDefinition {
  command?: string;
  loadingTpl?: string;
  promptTpl: string;
  resultTpl?: string;
  requireInput?: boolean;
}

/* eslint-disable no-template-curly-in-string */
const defaultPrompts: Record<string, PromptDefinition> = {
  define: {
    command: 'GeminiDefine',
    loadingTpl: 'Define:\n\n${input}\n\nAsking Gemini...',
    promptTpl:
      'Define the content below in locale ${locale}. The output is a bullet list of definitions grouped by parts of speech in plain text. Each item of the definition list contains pronunciation using IPA, meaning, and a list of usage examples with at most 2 items. Do not return anything else. Here is the content:\n\n${inputEncoded}',
    resultTpl: 'Original Content:\n\n${input}\n\nDefinition:\n\n${output}',
    requireInput: true,
  },
  translate: {
    command: 'GeminiTranslate',
    loadingTpl:
      'Translating the content below:\n\n${input}\n\nAsking Gemini...',
    promptTpl:
      'Translate the content below into locale ${locale}. Translate into ${alternateLocale} instead if it is already in ${locale}. Do not return anything else. Here is the content:\n\n${inputEncoded}',
    resultTpl: 'Original Content:\n\n${input}\n\nTranslation:\n\n${output}',
    requireInput: true,
  },
  improve: {
    command: 'GeminiImprove',
    loadingTpl: 'Improve the content below:\n\n${input}\n\nAsking Gemini...',
    promptTpl:
      'Improve the content below in the same locale. Do not return anything else. Here is the content:\n\n${inputEncoded}',
    resultTpl:
      'Original Content:\n\n${input}\n\nImproved Content:\n\n${output}',
    requireInput: true,
  },
  freeStyle: {
    command: 'GeminiAsk',
    loadingTpl: 'Question:\n\n${input}\n\nAsking Gemini...',
    promptTpl: '${input}',
    resultTpl: 'Question:\n\n${input}\n\nAnswer:\n\n${output}',
    requireInput: true,
  },
};

const options = {
  geminiApiKey: '',
  locale: 'en',
  alternateLocale: 'zh',
  prompts: defaultPrompts,
};

async function askGemini(
  prompt: string,
  handleResult?: (output: string) => string,
  handleError?: (error: any) => string,
) {
  const genAI = new GoogleGenerativeAI(options.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  console.info('Request', JSON.stringify(prompt));
  let text: string;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    text = response.text();
    if (handleResult) {
      text = handleResult(text);
    }
  } catch (error) {
    console.error(error);
    text = handleError ? handleError(error) : `Oops, I went blank.\n\n${error}`;
  }
  console.info('Response', text);
  return text;
}

let win: Window | undefined;

async function createPopup(text: string) {
  closePopup();

  const { nvim } = workspace;
  const buf = await nvim.createNewBuffer(false, true);
  const update = async (content: string) => {
    await buf.setLines(content.split('\n'), { start: 0, end: -1 });
  };
  win = await nvim.openFloatWindow(buf, false, {
    relative: 'cursor',
    border: 'single',
    title: 'coc-ai',
    style: 'minimal',
    width: 60,
    height: 20,
    row: 1,
    col: 0,
  } as any);
  await update(text);
  return update;
}

async function closePopup() {
  const { nvim } = workspace;
  if (!win || win.id === (await nvim.window).id) {
    return;
  }
  try {
    await win.close(true);
  } catch {
    // ignore
  }
  win = undefined;
}

async function getCword(): Promise<string> {
  const { nvim } = workspace;
  const cword = (await nvim.eval('expand("<cword>")')) as string;
  return cword;
}

async function getSelectedText(): Promise<string> {
  const doc = await workspace.document;
  const range = await window.getSelectedRange('v');
  return range ? doc.textDocument.getText(range).trim() : '';
}

function fillTemplate(tpl: string, args: Record<string, string>) {
  return tpl.replace(/\${(\w+)}/g, (m, g) => args[g] ?? m);
}

async function handlePrompt(name: string, input: string) {
  const def = options.prompts[name];
  const args: Record<string, string> = {
    locale: options.locale,
    alternateLocale: options.alternateLocale,
    input,
    inputEncoded: JSON.stringify(input),
  };
  if (def.requireInput && !input) {
    return;
  }
  const update = await createPopup(fillTemplate(def.loadingTpl || '', args));
  args.output = await askGemini(fillTemplate(def.promptTpl, args));
  update(fillTemplate(def.resultTpl || '${output}', args));
}

export function activate(context: ExtensionContext): void {
  const config = workspace.getConfiguration('coc-ai');
  options.geminiApiKey =
    config.get('geminiApiKey') || process.env.GEMINI_API_KEY || '';
  if (!options.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }
  options.locale = config.get('locale', 'en');
  options.alternateLocale = config.get('alternateLocale', 'zh');

  context.subscriptions.push(
    commands.registerCommand(
      'ai.handle',
      async (name: string, ...args: string[]) => {
        await handlePrompt(
          name,
          args.join(' ').trim() || (await getSelectedText()),
        );
      },
    ),
  );
  context.subscriptions.push(
    commands.registerCommand('ai.handleCword', async (name: string) => {
      await handlePrompt(name, await getCword());
    }),
  );
  context.subscriptions.push(
    workspace.registerAutocmd({
      event: ['CursorMoved', 'CursorMovedI'],
      callback: closePopup,
    }),
  );
}
