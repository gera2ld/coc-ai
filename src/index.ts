import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ExtensionContext,
  Window,
  commands,
  window,
  workspace,
} from 'coc.nvim';
import defaultPrompts from './default_prompts.json';
import { fillTemplate } from './util';

const prompts: PromptDefinition[] = defaultPrompts;

const options = {
  geminiApiKey: '',
  locale: 'en',
  alternateLocale: 'zh',
  prompts,
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

async function handlePrompt(name: string, input: string) {
  const def = options.prompts[name];
  const args: QueryContext = {
    locale: options.locale,
    alternateLocale: options.alternateLocale,
    input,
    output: '',
  };
  if (def.requireInput && !input) {
    return;
  }
  const update = await createPopup(fillTemplate(def.loadingTpl || '', args));
  args.output = await askGemini(fillTemplate(def.promptTpl, args));
  update(fillTemplate(def.resultTpl || '{{output}}', args));
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
          args.join(' ').trim() ||
            (await getSelectedText()) ||
            (await getCword()),
        );
      },
    ),
  );
  context.subscriptions.push(
    workspace.registerAutocmd({
      event: ['CursorMoved', 'CursorMovedI'],
      callback: closePopup,
    }),
  );
}
