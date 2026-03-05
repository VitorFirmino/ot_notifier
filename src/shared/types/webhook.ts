export interface WebhookPayload {
  content?: string;
  embeds?: WebhookEmbed[];
  username?: string;
  avatar_url?: string;
}

export interface WebhookEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: WebhookField[];
  footer?: WebhookFooter;
  timestamp?: string;
}

export interface WebhookField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface WebhookFooter {
  text: string;
  icon_url?: string;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retries?: number;
}
