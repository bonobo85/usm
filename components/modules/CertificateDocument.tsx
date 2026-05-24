import { UsmSeal } from '@/components/ui/UsmSeal';

export interface CertificateData {
  // Signataire
  signer_name?: string;
  signer_grade?: string;
  signer_post?: string;
  signer_location?: string;
  signer_email?: string;
  // Agent concerné
  agent_name?: string;
  agent_grade?: string;
  // Spécifiques
  evaluator_name?: string;       // formation / recrutement
  probation_duration?: string;   // recrutement
  training_name?: string;        // formation
  badge_name?: string;           // retrait badge
  removal_reason?: string;       // retrait badge
  departure_type?: string;       // démission / licenciement
  departure_reason?: string;     // démission / licenciement
  city?: string;
  custom_text?: string;
}

export interface CertificateRecord {
  id: string;
  ref_number: string | null;
  type: 'recruitment' | 'formation' | 'badge_removal' | 'dismissal';
  is_crash: boolean;
  issued_at: string;
  data: CertificateData;
}

const TYPE_TITLES: Record<CertificateRecord['type'], string> = {
  recruitment: 'Attestation de Recrutement',
  formation: 'Attestation de Formation',
  badge_removal: 'Attestation de Retrait de Badge',
  dismissal: 'Attestation de Fin de Service',
};

function formatFrenchDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Valeur dynamique affichée en bleu (comme sur le modèle) */
function V({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#2c5fb8', fontWeight: 600 }}>{children}</span>;
}

export function CertificateDocument({ cert }: { cert: CertificateRecord }) {
  const d = cert.data || {};
  const accent = cert.is_crash ? '#2c5fb8' : '#b08d3a'; // bandeau bleu CRASH sinon or
  const accentDark = cert.is_crash ? '#1d2052' : '#6b4e15';

  return (
    <div
      className="certificate-doc"
      style={{
        background: '#ffffff',
        color: '#1a1a1a',
        fontFamily: 'Georgia, "Times New Roman", serif',
        width: '100%',
        maxWidth: 760,
        margin: '0 auto',
        padding: '36px 44px 28px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        position: 'relative',
        borderRadius: 4,
      }}
    >
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
        <UsmSeal size={96} />

        <div style={{ textAlign: 'right', flex: 1, paddingTop: 4 }}>
          <div
            style={{
              display: 'inline-block',
              background: `linear-gradient(90deg, ${accent}, ${accentDark})`,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              padding: '5px 16px',
              marginBottom: 14,
            }}
          >
            UNITED STATES MARSHALS SERVICE
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.7, color: '#1a1a1a' }}>
            <div style={{ fontWeight: 700 }}>
              {d.signer_post || 'Poste BCSO'} <span style={{ color: accent }}>|</span> {d.signer_location || 'Sandy Shores'}
            </div>
            <div>Email : {d.signer_email || 'leader.usm@bcso.revolution.com'}</div>
            <div>{formatFrenchDate(cert.issued_at)}</div>
          </div>
        </div>
      </div>

      {/* Titre */}
      <h1
        style={{
          textAlign: 'center',
          fontSize: 26,
          fontWeight: 700,
          margin: '28px 0 30px',
          color: '#1a1a1a',
          letterSpacing: 0.3,
        }}
      >
        {TYPE_TITLES[cert.type]}
      </h1>

      {/* Corps selon le type */}
      <div style={{ fontSize: 14.5, lineHeight: 2, color: '#1a1a1a' }}>
        {cert.type === 'recruitment' && <RecruitmentBody d={d} />}
        {cert.type === 'formation' && <FormationBody d={d} />}
        {cert.type === 'badge_removal' && <BadgeRemovalBody d={d} />}
        {cert.type === 'dismissal' && <DismissalBody d={d} />}

        <p style={{ fontSize: 13, lineHeight: 1.8, marginTop: 22, color: '#333' }}>
          Je certifie sur l&apos;honneur que ce document a été réalisé en toute bonne foi et en pleine
          possession de mes moyens.
          {d.custom_text ? ` ${d.custom_text}` : ''}
        </p>
      </div>

      {/* Pied : sceau + devise + signature */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 40,
          gap: 16,
        }}
      >
        <UsmSeal size={80} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div
            style={{
              fontFamily: '"Dancing Script", "Brush Script MT", cursive',
              fontSize: 26,
              color: '#1a1a1a',
              marginBottom: 4,
            }}
          >
            Justice, Integrity, Service
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <div
            style={{
              fontFamily: '"Dancing Script", "Brush Script MT", cursive',
              fontSize: 24,
              color: '#1a1a1a',
            }}
          >
            {d.signer_grade || 'Co-Leader'} {(d.signer_name || '171').replace(/[^0-9]/g, '') || ''}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6, letterSpacing: 0.5 }}>
            UNITED STATES MARSHALS SERVICE
          </div>
          <div style={{ fontSize: 11, color: '#444' }}>{d.city || d.signer_location || 'Vinewood'}</div>
        </div>
      </div>

      {/* Numéro de référence */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 12,
          borderTop: '1px solid #e0e0e0',
          fontSize: 10,
          color: '#999',
          textAlign: 'center',
          fontFamily: 'monospace',
        }}
      >
        {cert.ref_number || 'USM-CERT-····'} {cert.is_crash ? '· Division CRASH' : ''}
      </div>
    </div>
  );
}

function RecruitmentBody({ d }: { d: CertificateData }) {
  return (
    <>
      <p>
        Je soussigné, <V>{d.signer_name || 'Monsieur Scott 171'}</V>, {d.signer_grade || 'Co-Leader'} des
        U.S.M de Los Santos
      </p>
      <p>
        déclare que l&apos;agent surnommé : <V>{d.agent_grade ? `${d.agent_grade} ` : ''}{d.agent_name || 'Stan 155'}</V> intègre
        les rangs du U.S.M ce jour.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
        <li style={{ marginBottom: 8 }}>
          — L&apos;agent <V>{d.agent_name || 'Stan 155'}</V> a été évalué par <V>{d.evaluator_name || 'Milano 104'}</V>{' '}
          Formateur du U.S.M de Los Santos.
        </li>
        <li>
          — L&apos;agent <V>{d.agent_name || 'Stan 155'}</V> est donc en période probatoire pendant une durée de{' '}
          <strong>{d.probation_duration || '2 semaines'}</strong>.
        </li>
      </ul>
    </>
  );
}

function FormationBody({ d }: { d: CertificateData }) {
  return (
    <>
      <p>
        Je soussigné, <V>{d.signer_name || 'le Co-Leader'}</V>, {d.signer_grade || 'Co-Leader'} des U.S.M de
        Los Santos
      </p>
      <p>
        atteste que l&apos;agent <V>{d.agent_grade ? `${d.agent_grade} ` : ''}{d.agent_name || ''}</V> a suivi et
        validé avec succès la formation : <strong>{d.training_name || '—'}</strong>.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
        <li>
          — Formation dispensée par <V>{d.evaluator_name || '—'}</V>, Formateur du U.S.M.
        </li>
      </ul>
    </>
  );
}

function BadgeRemovalBody({ d }: { d: CertificateData }) {
  return (
    <>
      <p>
        Je soussigné, <V>{d.signer_name || 'le Co-Leader'}</V>, {d.signer_grade || 'Co-Leader'} des U.S.M de
        Los Santos
      </p>
      <p>
        déclare procéder au retrait du badge <strong>{d.badge_name || '—'}</strong> de l&apos;agent{' '}
        <V>{d.agent_grade ? `${d.agent_grade} ` : ''}{d.agent_name || ''}</V>.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
        <li>— Motif : {d.removal_reason || '—'}</li>
      </ul>
    </>
  );
}

function DismissalBody({ d }: { d: CertificateData }) {
  const isDemission = (d.departure_type || '').toLowerCase().includes('démission');
  return (
    <>
      <p>
        Je soussigné, <V>{d.signer_name || 'le Co-Leader'}</V>, {d.signer_grade || 'Co-Leader'} des U.S.M de
        Los Santos
      </p>
      <p>
        déclare que l&apos;agent <V>{d.agent_grade ? `${d.agent_grade} ` : ''}{d.agent_name || ''}</V> quitte
        les rangs du U.S.M ce jour ({d.departure_type || 'fin de service'}).
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
        <li>— Motif : {d.departure_reason || '—'}</li>
        {!isDemission && (
          <li style={{ marginTop: 8 }}>
            — Cette décision prend effet immédiatement.
          </li>
        )}
      </ul>
    </>
  );
}
