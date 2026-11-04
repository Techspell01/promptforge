import { Tiktoken } from "js-tiktoken/lite";
import o200kBase from "js-tiktoken/ranks/o200k_base";

// o200k_base is the encoding family used by gpt-oss and recent OpenAI models; counts for
// other providers are close estimates, which is why the UI labels them "o200k".
let encoder: Tiktoken | undefined;

function getEncoder(): Tiktoken {
  encoder ??= new Tiktoken(o200kBase);
  return encoder;
}

export const TOKENIZER_NAME = "o200k_base";

export function countTokens(text: string): number {
  if (text.length === 0) return 0;
  return getEncoder().encode(text).length;
}

export type TokenCounter = (text: string) => number;
