# Deployment environment variables

Set these in Coolify. Do not commit real credentials.

## Required to start

| Variable | Required | Expected value |
| --- | --- | --- |
| `DATABASE_URL` | Yes, unless `NEON_DATABASE_URL` is set | Standard PostgreSQL connection URL, for example `postgresql://user:password@host:5432/database`. Used for application data, anonymous sessions, and Tractatus tables. |
| `NEON_DATABASE_URL` | No | Explicit external Neon PostgreSQL connection string, including its password and SSL settings. When set, this takes precedence over `DATABASE_URL` for every app pool and schema command. |
| `SESSION_SECRET` | Yes in production | Long, random secret used to sign session cookies. Use at least 32 random bytes. The development server has a local-only fallback; production intentionally refuses to start without this value. |

## Runtime settings

| Variable | Required | Expected value |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `5000`; the container exposes port `5000`. |
| `NODE_ENV` | No | Set to `production`. The production start script sets this automatically. |

## Optional feature credentials

The server starts without these credentials. Only the associated feature/provider is unavailable until its key is supplied.

| Variable | Required | Expected value |
| --- | --- | --- |
| `OPENAI_API_KEY` or `ZHI1_API_KEY` | No | OpenAI API key for ZHI 1. |
| `ANTHROPIC_API_KEY` or `ZHI2_API_KEY` | No | Anthropic API key for ZHI 2. |
| `DEEPSEEK_API_KEY` or `ZHI3_API_KEY` | No | DeepSeek API key for ZHI 3. |
| `PERPLEXITY_API_KEY` or `ZHI4_API_KEY` | No | Perplexity API key for ZHI 4. |
| `VENICE_API_KEY` | No | Venice API key for ZHI 5. |
| `XAI_API_KEY` | No | xAI API key for ZHI 6. |
| `ASSEMBLYAI_API_KEY` | No | AssemblyAI API key for voice dictation. |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for payment endpoints. |
| `STRIPE_WEBHOOK_SECRET_MINDPROBE` | No | Stripe webhook signing secret; needed to validate incoming Stripe webhooks. |

## Build-time browser setting

| Variable | Required | Expected value |
| --- | --- | --- |
| `VITE_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key embedded in the browser build. With the supplied Dockerfile, pass it as the `STRIPE_PUBLISHABLE_KEY` build argument if checkout should be enabled. |

## Not needed

This app has anonymous browser sessions, not a login/OAuth flow, so no OAuth callback URL or `PUBLIC_BASE_URL` is read. The public canonical URL is configured in the HTML metadata.
