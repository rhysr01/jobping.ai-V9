import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const auth = req.headers.get("authorization");
	const basicUser = process.env.ADMIN_BASIC_USER;
	const basicPass = process.env.ADMIN_BASIC_PASS;

	if (!basicUser || !basicPass) {
		return NextResponse.json({ ok: false }, { status: 403 });
	}

	if (!auth || !auth.startsWith("Basic ")) {
		return NextResponse.json({ ok: false }, { status: 401 });
	}

	const [user, pass] = Buffer.from(auth.split(" ")[1] || "", "base64")
		.toString()
		.split(":");

	if (user !== basicUser || pass !== basicPass) {
		return NextResponse.json({ ok: false }, { status: 401 });
	}

	return NextResponse.json({ ok: true });
}
