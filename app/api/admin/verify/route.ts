import { type NextRequest, NextResponse } from "next/server";

function verifyAuth(req: NextRequest): { authorized: boolean; status: number } {
  const auth = req.headers.get("authorization");
  const basicUser = process.env.ADMIN_BASIC_USER;
  const basicPass = process.env.ADMIN_BASIC_PASS;

  if (!basicUser || !basicPass) {
    return { authorized: false, status: 403 };
  }

  if (!auth || !auth.startsWith("Basic ")) {
    return { authorized: false, status: 401 };
  }

  const [user, pass] = Buffer.from(auth.split(" ")[1] || "", "base64")
    .toString()
    .split(":");

  if (user !== basicUser || pass !== basicPass) {
    return { authorized: false, status: 401 };
  }

  return { authorized: true, status: 200 };
}

export async function GET(req: NextRequest) {
  const authResult = verifyAuth(req);
  if (!authResult.authorized) {
    return NextResponse.json({ ok: false }, { status: authResult.status });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const authResult = verifyAuth(req);
  if (!authResult.authorized) {
    return NextResponse.json({ ok: false }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email required" },
        { status: 400 },
      );
    }

    // Admin verification logic would go here
    // For now, just return success
    return NextResponse.json({ ok: true, email });
  } catch (_error) {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }
}
