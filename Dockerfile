FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install -g npm@11 && npm ci

COPY . .

# Stripe's publishable key is public and is embedded into the browser build.
ARG STRIPE_PUBLISHABLE_KEY

RUN VITE_STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}" npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/complete_instructions.txt ./complete_instructions.txt

EXPOSE 5000

CMD ["npm", "start"]
