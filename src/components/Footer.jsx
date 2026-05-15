// src/components/Footer.tsx
export default function Footer() {
    return (
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} YT Comments Analyzer. All rights reserved.</p>
        </div>
      </footer>
    );
  }