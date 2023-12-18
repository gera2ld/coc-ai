import {
  ExtensionContext,
  commands,
  workspace,
  window,
  Window,
} from 'coc.nvim';
import { GoogleGenerativeAI } from '@google/generative-ai';

const options = {
  geminiApiKey: '',
  locale: 'en',
  alternateLocale: 'zh',
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

async function handleDefine(input: string) {
  if (!input) {
    return;
  }
  const update = await createPopup(`Query: ${input}\n\nAsking Gemini...`);
  const result = await askGemini(
    `Define the content below in locale ${
      options.locale
    }. The output is a bullet list of definitions grouped by parts of speech in plain text. Each item of the definition list contains pronunciation using IPA, meaning, and a list of usage examples with at most 2 items. Do not return anything else. Here is the content:\n\n${JSON.stringify(
      input,
    )}`,
    (output) => `Query: ${input}\n\n${output}`,
  );
  update(result);
}

async function handleTranslate(input: string) {
  if (!input) {
    return;
  }
  const update = await createPopup(
    `Translating the content below:\n\n${input}\n\nAsking Gemini...`,
  );
  const result = await askGemini(
    `Translate the content below into locale ${
      options.locale
    }. Translate into ${options.alternateLocale} instead if it is already in ${
      options.locale
    }. Do not return anything else. Here is the content:\n\n${JSON.stringify(
      input,
    )}`,
    (output) => `Source:\n\n${input}\n\nResult:\n\n${output}`,
  );
  update(result);
}

async function handleFreeStyle(input: string) {
  if (!input) {
    return;
  }
  const update = await createPopup(`Asking Gemini...\n\n${input}`);
  const result = await askGemini(
    input,
    (output) => `Question:\n\n${input}\n\n${output}`,
  );
  update(result);
}

export function activate(context: ExtensionContext): void {
  const config = workspace.getConfiguration('coc-ai');
  options.geminiApiKey = config.get(
    'geminiApiKey',
    process.env.GEMINI_API_KEY || '',
  );
  if (!options.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }
  options.locale = config.get('locale', 'en');
  options.alternateLocale = config.get('alternateLocale', 'zh');

  context.subscriptions.push(
    commands.registerCommand(
      'ai.ask',
      async (...args: string[]) =>
        await handleFreeStyle(
          args.join(' ').trim() || (await getSelectedText()),
        ),
    ),
  );
  context.subscriptions.push(
    commands.registerCommand('ai.define', async (...args: string[]) => {
      await handleDefine(args.join(' ').trim() || (await getCword()));
    }),
  );
  context.subscriptions.push(
    commands.registerCommand('ai.translate', async (...args: string[]) => {
      await handleTranslate(args.join(' ').trim() || (await getSelectedText()));
    }),
  );
  context.subscriptions.push(
    workspace.registerAutocmd({
      event: ['CursorMoved', 'CursorMovedI'],
      callback: closePopup,
    }),
  );
}
