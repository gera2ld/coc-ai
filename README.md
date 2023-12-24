# coc-ai

![NPM](https://img.shields.io/npm/v/coc-ai.svg)

A coc.nvim plugin to support AI in Neovim.

Currently powered by Google Gemini.

https://github.com/gera2ld/coc-ai/assets/3139113/eead707d-fbda-4edb-9569-f4a48bdafff3

## Installation

First [get an API key](https://ai.google.dev/tutorials/setup) from Gemini. It's free!

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
:CocCommand ai.handleCword define

" Define a word
:CocCommand ai.handle define happy

" Translate the selected text
:CocCommand ai.handle translate

" Translate the specified text
:CocCommand ai.handle translate I am happy.

" Ask anything, either specified or from the selected text
:CocCommand ai.handle freeStyle Tell a joke.
```

## Related Projects

- [ai.nvim](https://github.com/gera2ld/ai.nvim) - A Neovim plugin written in Lua, powered by Gemini
