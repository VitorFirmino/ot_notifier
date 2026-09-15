export class LoginRequiredError extends Error {
  constructor(public readonly domain: string, public readonly loginUrl: string) {
    super(`Login necessário para acessar ${domain}.`);
  }
}

const LOGIN_PATH_PATTERN = /page=login/i;
const PASSWORD_FIELD_PATTERN = /<input[^>]*type=["']password["']/i;
const LOGIN_TEXT_PATTERN = /login|entrar|autentica[cç][aã]o|fazer\s*log\s*in/i;

export const detectLoginRequiredPage = (html: string, requestUrl: string): string | null => {
  if (!html) return null;

  const formActionMatch = html.match(/<form[^>]*action=["']([^"']*)["']/i);
  const formAction = formActionMatch?.[1];
  if (formAction && LOGIN_PATH_PATTERN.test(formAction)) {
    return new URL(formAction, requestUrl).toString();
  }

  const hasPasswordField = PASSWORD_FIELD_PATTERN.test(html);
  const looksLikeLogin = LOGIN_TEXT_PATTERN.test(html);
  if (hasPasswordField && looksLikeLogin) {
    return requestUrl;
  }

  return null;
};
