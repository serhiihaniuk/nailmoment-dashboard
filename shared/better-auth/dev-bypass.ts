export function isAuthDisabledForDev() {
  return (
    process.env.NEXT_PUBLIC_DISABLE_AUTH === "true" ||
    process.env.DISABLE_AUTH === "true" ||
    process.env.NODE_ENV === "development" ||
    (!!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
  );
}
