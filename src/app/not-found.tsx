import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">
        Nie znaleziono strony
      </h1>
      <p className="mt-1 text-sm text-muted">
        Ten projekt lub zadanie nie istnieje albo zostało usunięte.
      </p>
      <Link href="/" className="btn btn-outline mt-6">
        Wróć do projektów
      </Link>
    </div>
  );
}
