"use client";

// Replaces the root layout when it fails, so it brings its own <html>/<body>
// and minimal inline styling (global CSS isn't guaranteed to be available).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16 }}>
        <title>Something went wrong · Poller</title>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
          <p style={{ color: "#555" }}>Poller hit an unexpected error. Please try again.</p>
          {error.digest && <p style={{ color: "#777", fontSize: 12 }}>Reference: {error.digest}</p>}
          <button
            onClick={() => retry()}
            style={{ marginTop: 12, minHeight: 44, padding: "0 20px", borderRadius: 16, border: 0, background: "#00786f", color: "white", fontSize: 16 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
