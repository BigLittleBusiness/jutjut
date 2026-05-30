export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // PinPayments
  pinPaymentsSecretKey: process.env.PIN_PAYMENTS_SECRET_KEY ?? "",
  pinPaymentsPublishableKey: process.env.PIN_PAYMENTS_PUBLISHABLE_KEY ?? "",
  pinPaymentsWebhookSecret: process.env.PIN_PAYMENTS_WEBHOOK_SECRET ?? "",
  pinPaymentsBaseUrl: process.env.PIN_PAYMENTS_BASE_URL ?? "https://test-api.pinpayments.com/1",
};
