import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-24">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Rudi
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sera ya Faragha / Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Imesasishwa: 7 Juni 2026</p>
        </div>
      </div>

      <article className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold">1. Utangulizi / Introduction</h2>
          <p>TeleMed ("sisi", "we") ni jukwaa la afya ya kidijitali linalounganisha wagonjwa, madaktari, hospitali, polyclinics, famasi na maabara Tanzania na kanda. Sera hii inaeleza jinsi tunavyokusanya, kutumia na kulinda data yako binafsi kwa mujibu wa <strong>GDPR (EU 2016/679)</strong>, Sheria ya Ulinzi wa Data Binafsi Tanzania (2022), na viwango vya HIPAA kwa data ya afya.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Data tunayokusanya / Data we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Utambulisho:</strong> jina, barua pepe, namba ya simu, nchi, picha ya wasifu.</li>
            <li><strong>Data ya afya:</strong> dalili, historia ya matibabu, dawa, vipimo, mazungumzo na madaktari, picha za matibabu (special category data — GDPR Art. 9).</li>
            <li><strong>Data ya kifaa:</strong> aina ya kifaa, IP, lugha, mahali (ikiwa umeruhusu).</li>
            <li><strong>Maagizo:</strong> dawa ulizoagiza, vipimo ulivyobooki, miadi.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Msingi wa kisheria / Lawful basis (GDPR Art. 6 &amp; 9)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Ridhaa (Consent)</strong> — kwa data ya afya na mawasiliano ya masoko.</li>
            <li><strong>Mkataba (Contract)</strong> — kutoa huduma ulizoomba.</li>
            <li><strong>Wajibu wa kisheria</strong> — uhifadhi wa kumbukumbu za matibabu.</li>
            <li><strong>Maslahi muhimu</strong> — dharura za kiafya.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Usalama na usimbaji / Security &amp; Encryption</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Usafirishaji:</strong> TLS 1.3 (HTTPS) kwa mawasiliano yote.</li>
            <li><strong>Hifadhi:</strong> AES-256 kwa data yote ya database na files.</li>
            <li><strong>Nenosiri:</strong> bcrypt hashing — hatuhifadhi nenosiri lako wazi.</li>
            <li><strong>Row-Level Security (RLS):</strong> kila row imelindwa — mtumiaji anaona data yake tu.</li>
            <li><strong>Kudhibiti ufikiaji:</strong> majukumu (patient, doctor, admin) yamewekwa kwenye database, hayawezi kubadilishwa kutoka kwa kifaa.</li>
            <li><strong>Backup:</strong> kila siku, zimesimbwa, hifadhi za mbali.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Tunashare na nani? / Who we share with</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Daktari, hospitali, famasi au maabara <strong>uliyochagua</strong> tu.</li>
            <li>Watoa huduma za kiufundi (Supabase — hosting, OpenStreetMap — ramani) chini ya Data Processing Agreement.</li>
            <li>Mamlaka za kisheria pale inapohitajika kisheria.</li>
            <li><strong>Hatuuzi data yako kamwe.</strong></li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Haki zako / Your GDPR rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Kufikia (Access)</strong> — pakua data yako yote.</li>
            <li><strong>Kurekebisha (Rectification)</strong> — sahihisha taarifa zisizo sahihi.</li>
            <li><strong>Kufuta (Erasure / "right to be forgotten")</strong> — futa akaunti yako.</li>
            <li><strong>Kuhamisha (Portability)</strong> — pata data yako katika format ya JSON/CSV.</li>
            <li><strong>Kukataa (Object)</strong> — kataa usindikaji wa masoko.</li>
            <li><strong>Kuondoa ridhaa (Withdraw consent)</strong> wakati wowote.</li>
          </ul>
          <p className="mt-2">Tuma ombi kwa: <a href="mailto:privacy@telemed.app" className="text-primary underline">privacy@telemed.app</a> — tutajibu ndani ya siku 30.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Muda wa kuhifadhi / Retention</h2>
          <p>Data ya afya: miaka 10 (kufuata sheria ya matibabu). Data ya akaunti: hadi ufute akaunti. Kumbukumbu za kifedha: miaka 7.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Watoto / Children</h2>
          <p>Watumiaji chini ya miaka 16 lazima wapate ridhaa ya mzazi/mlezi.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">9. Mawasiliano / Contact</h2>
          <p>Data Protection Officer: <a href="mailto:dpo@telemed.app" className="text-primary underline">dpo@telemed.app</a></p>
          <p>Una haki ya kulalamika kwa mamlaka ya ulinzi wa data ya nchi yako.</p>
        </section>
      </article>
    </div>
  );
}
