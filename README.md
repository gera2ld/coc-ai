# coc-ai

![NPM](https://img.shields.io/npm/v/coc-ai.svg)

A coc.nvim plugin to support AI in Neovim.

Currently powered by Google Gemini.

https://github.com/gera2ld/coc-ai/assets/3139113/eead707d-fbda-4edb-9569-f4a48bdafff3

## Installation

```viml
:CocInstall coc-ai
```

Set the API key and other options in `:CocConfig`:

```json
{
  "coc-ai.geminiApiKey": "PUT_YOUR_KEY_HERE",
  "coc-ai.locale": "en",
  "coc-ai.alternateLocale": "zh"
}
```

## Usage

```viml
" Define the word under cursor
:CocCommand ai.define

" Define a word
:CocCommand ai.define happy

" Translate the selected text
:CocCommand ai.translate

" Translate the specified text
:CocCommand ai.translate I am happy.

" Ask anything, either specified or from the selected text
:CocCommand ai.ask
```
