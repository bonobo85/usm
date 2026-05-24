import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { fetchGuildMember, hasBcsoRole, hasUsmRole } from '@/lib/discord/api';
import { ApplyForm } from './ApplyForm';

export const dynamic = 'force-dynamic';

export default async function ApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pas connecté → page de login spécifique
  if (!user) {
    return <NotLoggedIn />;
  }

  // Vérification rôle Discord
  const meta = user.user_metadata || {};
  const discordId = meta.provider_id || meta.sub || meta.discord_id;

  if (!discordId) {
    return <ErrorState title="Erreur" message="Impossible de récupérer ton compte Discord." />;
  }

  const member = await fetchGuildMember(discordId);

  if (!member) {
    return (
      <ErrorState
        title="Pas membre du Discord"
        message="Tu dois être membre du serveur Discord de Revolution RP pour postuler."
      />
    );
  }

  // Déjà USM → redirige vers dashboard
  if (hasUsmRole(member.roles)) {
    redirect('/dashboard');
  }

  // Pas BCSO → message
  if (!hasBcsoRole(member.roles)) {
    return (
      <ErrorState
        title="Rôle BCSO requis"
        message="Tu dois avoir le rôle BCSO sur le Discord pour postuler aux USM. Si tu penses avoir ce rôle, vérifie que c'est bien le cas auprès d'un staff BCSO."
      />
    );
  }

  // Vérifie s'il a déjà une candidature en cours
  const adminClient = createAdminClient();
  const { data: existingApp } = await adminClient
    .from('applications')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .in('status', ['pending', 'in_review'])
    .maybeSingle();

  if (existingApp) {
    return <AlreadyApplied createdAt={existingApp.created_at} />;
  }

  // Charge les questions approuvées
  const { data: questions } = await adminClient
    .from('application_form_questions')
    .select('*')
    .eq('status', 'approved')
    .order('position');

  return (
    <ApplyShell title="Candidature USM">
      <ApplyForm
        questions={questions || []}
        userId={user.id}
        discordId={discordId}
        discordUsername={meta.full_name || meta.name || meta.user_name || 'Anonyme'}
      />
    </ApplyShell>
  );
}

function ApplyShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-start py-12 px-4"
      style={{
        background: `
          radial-gradient(ellipse 800px 400px at 50% 0%, rgba(212, 161, 58, 0.10), transparent 60%),
          #0a0a12
        `,
      }}
    >
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-usm-gold to-usm-gold-dark flex items-center justify-center text-[#0a0a12] text-3xl font-black mb-4 shadow-2xl shadow-usm-gold/30">
            ★
          </div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="text-text-faint text-sm mt-2">United States Marshals · Revolution RP</p>
        </div>
        {children}
      </div>
    </main>
  );
}

function NotLoggedIn() {
  return (
    <ApplyShell title="Postuler aux USM">
      <div className="card p-8 text-center space-y-6">
        <p className="text-text">
          Pour postuler, connecte-toi avec ton compte Discord. Tu dois avoir le rôle{' '}
          <strong className="text-usm-gold-light">BCSO</strong> sur le serveur Revolution RP.
        </p>
        <a
          href="/auth/login-discord?next=/apply"
          className="inline-flex items-center gap-2.5 bg-gradient-to-br from-[#5865f2] to-[#404eed] text-white py-3 px-7 rounded-xl text-sm font-semibold shadow-lg shadow-[#5865f2]/30 hover:-translate-y-0.5 hover:shadow-xl transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          Se connecter avec Discord
        </a>
      </div>
    </ApplyShell>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <ApplyShell title={title}>
      <div className="card p-8 text-center">
        <p className="text-text leading-relaxed">{message}</p>
        <a
          href="/login"
          className="inline-block mt-6 text-usm-gold-light text-sm hover:underline"
        >
          ← Retour à l&apos;accueil
        </a>
      </div>
    </ApplyShell>
  );
}

function AlreadyApplied({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt).toLocaleDateString('fr-FR');
  return (
    <ApplyShell title="Candidature déjà envoyée">
      <div className="card p-8 text-center space-y-4">
        <p className="text-text">
          Tu as déjà soumis une candidature le <strong>{date}</strong>. Elle est en cours d&apos;examen.
        </p>
        <p className="text-text-faint text-sm">
          Tu recevras une notification Discord dès qu&apos;une décision aura été prise.
        </p>
      </div>
    </ApplyShell>
  );
}
