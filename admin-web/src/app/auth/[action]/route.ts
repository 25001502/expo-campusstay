import { unavailableAuthResponse } from "../../../lib/auth/runtime.server";

// Closed BFF endpoints, including callback. Never read bodies, codes or cookies, instantiate
// a provider, exchange tokens, redirect, or contact Supabase in this phase.
export const dynamic = "force-dynamic";
export const GET = unavailableAuthResponse;
export const POST = unavailableAuthResponse;
