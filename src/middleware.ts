export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/leagues/:path*", "/admin/:path*"],
};
