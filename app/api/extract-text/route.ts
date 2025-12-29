import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * ファイルからテキストを抽出
 * POST /api/extract-text
 *
 * 対応形式:
 * - .docx (Word)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();

    // Wordファイル (.docx)
    if (fileName.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      console.log(`📝 Wordファイルからテキスト抽出: ${file.name} (${text.length}文字)`);

      return NextResponse.json({ text });
    }

    return NextResponse.json(
      { error: "対応していないファイル形式です" },
      { status: 400 }
    );
  } catch (error) {
    console.error("テキスト抽出エラー:", error);
    return NextResponse.json(
      { error: "テキストの抽出に失敗しました", details: String(error) },
      { status: 500 }
    );
  }
}
