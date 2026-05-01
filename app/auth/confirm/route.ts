import { handleAuthConfirmRequest } from "@/lib/supabase/auth-confirm";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return handleAuthConfirmRequest(req);
}
