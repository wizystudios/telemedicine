import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-24">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Rudi
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Masharti ya Matumizi / Terms of Service</h1>
          <p className="text-xs text-muted-foreground">Imesasishwa: 7 Juni 2026</p>
        </div>
      </div>

      <article className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold">1. Kukubali masharti / Acceptance</h2>
          <p>Kwa kutumia TeleMed unakubali masharti haya. Ikiwa hukubali, tafadhali usitumie huduma.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Huduma / Services</h2>
          <p>TeleMed ni jukwaa la kuunganisha — <strong>siyo mtoa huduma za matibabu</strong>. Huduma za kitaalamu zinatolewa na madaktari, hospitali, famasi na maabara waliosajiliwa na kuthibitishwa.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Akaunti yako / Your account</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Lazima uwe na umri wa miaka 18+ au pata ridhaa ya mzazi.</li>
            <li>Toa taarifa za kweli na zilizosasishwa.</li>
            <li>Linda nenosiri lako — wewe ndiye unahusika na shughuli zote.</li>
            <li>Tuarifu mara moja ikiwa unashuku ufikiaji usioidhinishwa.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Matumizi yanayoruhusiwa / Acceptable use</h2>
          <p>HUWEZI:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kutoa taarifa za uongo za kimatibabu.</li>
            <li>Kujifanya daktari/mtaalamu bila vyeti halali.</li>
            <li>Kuhujumu mfumo, kufanya scraping, au kushambulia usalama.</li>
            <li>Kutuma maudhui ya unyanyasaji, ubaguzi, au yenye madhara.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Onyo la kitabibu / Medical disclaimer</h2>
          <p>Maudhui ya Wizy (AI) na maelezo ya jumla ni kwa <strong>elimu tu</strong>. Hayachukui nafasi ya ushauri wa daktari. Katika dharura, piga huduma za dharura mara moja.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Malipo na maagizo / Payments &amp; orders</h2>
          <p>Bei zinazoonyeshwa ni za watoa huduma binafsi. TeleMed haiwajibiki na mabadiliko ya bei, ucheleweshaji wa famasi/maabara, au ubora wa dawa.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Mali ya kiakili / IP</h2>
          <p>TeleMed, logo, na code ni mali yetu. Maudhui unayoweka (rekodi, ujumbe) yanabaki yako, lakini unatupa leseni ya kuyatumia kutoa huduma.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Kusitishwa / Termination</h2>
          <p>Tunaweza kusimamisha akaunti yako ikiwa utakiuka masharti. Unaweza kufuta akaunti yako wakati wowote kupitia Profile → Futa Akaunti.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">9. Mipaka ya dhima / Liability</h2>
          <p>TeleMed inatolewa "kama ilivyo". Hatuwajibikii hasara isiyo ya moja kwa moja. Dhima yetu ya jumla haitazidi TZS 100,000 au kiasi ulicholipia katika miezi 12 iliyopita, kile kikubwa zaidi.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">10. Sheria inayotumika / Governing law</h2>
          <p>Masharti haya yanaongozwa na sheria za Jamhuri ya Muungano wa Tanzania. Migogoro itasuluhishwa katika mahakama za Dar es Salaam.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold">11. Mawasiliano / Contact</h2>
          <p><a href="mailto:legal@telemed.app" className="text-primary underline">legal@telemed.app</a></p>
        </section>
      </article>
    </div>
  );
}
