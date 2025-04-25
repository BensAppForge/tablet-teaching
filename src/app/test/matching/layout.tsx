export default function MatchingTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Matching Editor Test</h1>
      {children}
    </div>
  );
}
