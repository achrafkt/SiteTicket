import * as Joi from 'joi';

const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required().messages({
    'any.required':
      'JWT_SECRET is required — generate one with `openssl rand -base64 48` and set it in your environment.',
    'string.empty':
      'JWT_SECRET is required — generate one with `openssl rand -base64 48` and set it in your environment.',
    'string.min': 'JWT_SECRET must be at least 16 characters long.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().required().messages({
    'any.required':
      'FRONTEND_URL is required (comma-separated allowed origins) — refusing to start with a permissive CORS fallback.',
    'string.empty':
      'FRONTEND_URL is required (comma-separated allowed origins) — refusing to start with a permissive CORS fallback.',
  }),
  ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .default('admin@site-ticket.local'),
  ADMIN_PASSWORD: Joi.string().optional(),
  SEED_DEMO_DATA: Joi.boolean().default(false),
  DEMO_USER_PASSWORD: Joi.string().optional(),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),
  // File storage: all four required together to enable R2, otherwise the app
  // falls back to local disk (./uploads) — see StorageService.
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_ENDPOINT: Joi.string().uri().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),
})
  .unknown(true)
  .and(
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET_NAME',
  )
  .messages({
    'object.and':
      'R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT and R2_BUCKET_NAME must all be set together to enable R2 storage — leave all four unset to use local disk instead.',
  });

export type ValidatedEnv = {
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  FRONTEND_URL: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD?: string;
  SEED_DEMO_DATA: boolean;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ENDPOINT?: string;
  R2_BUCKET_NAME?: string;
};

export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
): ValidatedEnv {
  const result = envValidationSchema.validate(env, {
    abortEarly: false,
    convert: true,
  });

  if (result.error) {
    const details = result.error.details
      .map((detail) => `  - ${detail.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.value as ValidatedEnv;
}
