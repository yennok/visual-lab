// @vercel/blob resolves credentials in this order when no token is passed:
//   explicit token → VERCEL_OIDC_TOKEN (when BLOB_STORE_ID is set) → BLOB_READ_WRITE_TOKEN
// In local dev a stale VERCEL_OIDC_TOKEN hijacks that chain and every upload
// fails with "Access denied", even though BLOB_READ_WRITE_TOKEN is valid. So we
// pass the read-write token explicitly everywhere we touch Blob. Returns
// undefined when it isn't set (e.g. pure-OIDC environments) so the library's
// default resolution still applies there.
export function blobReadWriteToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}
