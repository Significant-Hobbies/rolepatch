export function SaasMakerAnalytics() {
  // Disabled until api.sassmaker.com allows rolepatch.com in analytics CORS.
  // A failed browser preflight is still emitted as a console error even when
  // the SDK promise is caught, which breaks production smoke checks.
  return null;
}
