import * as cheerio from "cheerio";

export class LoginRequiredError extends Error {
  constructor(public readonly domain: string, public readonly loginUrl: string) {
    super(`Login necessário para acessar ${domain}.`);
  }
}

const LOGIN_PATH_PATTERN = /page=login/i;
const PASSWORD_FIELD_PATTERN = /<input[^>]*type=["']password["']/i;
const LOGIN_CTA_PATTERN =
  /please\s*log\s*in|log\s*in\s*to\s*continue|log\s*in\s*to\s*view|fa[cç]a\s*login|efetue\s*login|login\s*necess[aá]rio|voc[eê]\s*precisa\s*(fazer\s*)?login|inicia\s*sesi[oó]n\s*para/i;

export const detectLoginRequiredPage = (html: string, requestUrl: string): string | null => {
  if (!html) return null;

  const formActionMatch = html.match(/<form[^>]*action=["']([^"']*)["']/i);
  const formAction = formActionMatch?.[1];
  if (formAction && LOGIN_PATH_PATTERN.test(formAction)) {
    return new URL(formAction, requestUrl).toString();
  }

  if (!PASSWORD_FIELD_PATTERN.test(html)) return null;

  const $ = cheerio.load(html);
  const $passwordField = $("input[type='password']").first();
  if ($passwordField.length === 0) return null;

  const $form = $passwordField.closest("form");
  const $precedingHeading = $form.prev("h1, h2, h3, h4, p");
  const nearbyText = `${$form.text()} ${$precedingHeading.text()}`;

  return LOGIN_CTA_PATTERN.test(nearbyText) ? requestUrl : null;
};
