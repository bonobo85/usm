import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-10 text-center"
      style={{
        background: `
          radial-gradient(ellipse 800px 400px at 50% 30%, rgba(212, 161, 58, 0.08), transparent 60%),
          #0a0a12
        `,
      }}
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] text-3xl font-black mb-6 shadow-2xl shadow-usm-gold/30">
        ★
      </div>
      <div className="text-6xl font-black text-usm-gold-light mb-2">404</div>
      <h1 className="text-2xl font-bold text-white mb-3">Page introuvable</h1>
      <p className="text-text-dim max-w-md mb-8">
        Cette page n&apos;existe pas ou a été déplacée. Vérifie l&apos;adresse ou retourne au tableau de bord.
      </p>
      <Link
        href="/dashboard"
        className="bg-gradient-to-br from-usm-gold to-usm-gold-dark text-[#0a0a12] py-3 px-7 rounded-xl text-sm font-semibold hover:-translate-y-0.5 transition-all"
      >
        Retour au tableau de bord
      </Link>
    </main>
  );
}
