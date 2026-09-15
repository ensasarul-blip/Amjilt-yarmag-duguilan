"use client";

/**
 * Хамгийн гүн түвшний алдаа (үндсэн layout өөрөө унасан тохиолдол).
 * Энэ файл өөрийн <html>/<body>-г үүсгэдэг бөгөөд globals.css хүрдэггүй тул
 * өнгө, фонтыг шууд бичнэ.
 */
const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="mn">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          backgroundColor: "#ede6f7",
          color: "#2e1a4f",
          fontFamily: FONT,
        }}
      >
        <title>Алдаа гарлаа | АМЖИЛТ КИБЕР ЯАРМАГ СУРГУУЛЬ</title>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#fff",
            border: "2px solid #c0392b",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, color: "#a5281b" }}>
            Уучлаарай, алдаа гарлаа
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
            Хуудсыг ачаалж чадсангүй. Доорх товчийг дарж дахин оролдоно уу.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 20,
              minHeight: 52,
              width: "100%",
              border: "none",
              borderRadius: 12,
              backgroundColor: "#3b1f6b",
              color: "#fff",
              fontSize: 16,
              fontWeight: "bold",
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            Дахин оролдох
          </button>
          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 12, color: "#6b4ba3" }}>
              Алдааны дугаар: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
