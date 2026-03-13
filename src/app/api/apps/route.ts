import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/apps — list saved apps for current user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("saved_apps")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ apps: data });
}

// POST /api/apps — save an app
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storeId, platform, name, iconUrl } = await request.json();
  if (!storeId || !platform || !name) {
    return NextResponse.json({ error: "Missing storeId, platform, or name" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("saved_apps")
    .upsert(
      { user_id: userId, store_id: storeId, platform, name, icon_url: iconUrl ?? null },
      { onConflict: "user_id,store_id,platform" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ app: data });
}

// DELETE /api/apps?id=<savedAppId>
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("saved_apps")
    .delete()
    .eq("id", id)
    .eq("user_id", userId); // ensure ownership

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
