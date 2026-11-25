import AppButton from '@/components/AppButton';
import AppInput from '@/components/AppInput';
import AppSelect from '@/components/AppSelect';
import AppTextarea from '@/components/AppTextarea';
import FeedbackMessage from '@/components/FeedbackMessage';

export type CoachBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  warmAccentColor: string;
  softAccentColor: string;
  bodyFont: string;
  displayFont: string;
};

interface CoachBrandingSettingsProps {
  description: string;
  descriptionLength: number;
  descriptionFeedback: { type: 'error' | 'success'; message: string } | null;
  savingDescription: boolean;
  branding: CoachBranding;
  brandingValid: boolean;
  savingBranding: boolean;
  brandingFeedback: { type: 'error' | 'success'; message: string } | null;
  onDescriptionChange: (value: string) => void;
  onSaveDescription: () => void;
  onBrandingChange: (key: keyof CoachBranding, value: string) => void;
  onSaveBranding: () => void;
}

const COLORS: { key: keyof CoachBranding; label: string }[] = [
  { key: 'primaryColor', label: 'Principal' },
  { key: 'secondaryColor', label: 'Secundario' },
  { key: 'backgroundColor', label: 'Fondo' },
  { key: 'accentColor', label: 'Acento' },
  { key: 'surfaceColor', label: 'Superficie' },
  { key: 'textColor', label: 'Texto' },
  { key: 'mutedColor', label: 'Texto tenue' },
  { key: 'borderColor', label: 'Bordes' },
  { key: 'warmAccentColor', label: 'Acento cálido' },
  { key: 'softAccentColor', label: 'Acento suave' },
];

const FONTS = ['DM Sans', 'Fraunces', 'Inter', 'Sora', 'Roboto', 'Montserrat', 'Poppins', 'Manrope', 'Lato', 'Nunito', 'Merriweather', 'Playfair Display', 'Source Serif 4', 'Raleway', 'Work Sans'];

export default function CoachBrandingSettings(props: CoachBrandingSettingsProps) {
  return (
    <>
      <div className="space-y-2 border-t border-zinc-800 pt-4">
        <label className="block text-xs font-semibold text-zinc-300" htmlFor="tenant-login-description">Descripción del inicio de sesión</label>
        <AppTextarea className="resize-y px-3 py-2.5" id="tenant-login-description" maxLength={280} onChange={(event) => props.onDescriptionChange(event.target.value)} placeholder="Cuéntales brevemente qué ofrece tu gimnasio" rows={3} value={props.description} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] text-zinc-500">{props.descriptionLength}/280 caracteres</p>
          <AppButton disabled={props.savingDescription} onClick={props.onSaveDescription} type="button">{props.savingDescription ? 'Guardando…' : 'Guardar descripción'}</AppButton>
        </div>
        {props.descriptionFeedback && <FeedbackMessage kind={props.descriptionFeedback.type} message={props.descriptionFeedback.message} />}
      </div>

      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <div>
          <p className="text-xs font-semibold text-zinc-300">Paleta del gimnasio</p>
          <p className="mt-1 text-[10px] text-zinc-500">Estos colores se aplican al entorno de tu gimnasio.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {COLORS.map(({ key, label }) => (
            <label className="grid min-w-0 gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-2 text-[11px] text-zinc-400 sm:px-3" key={key}>
              <span className="flex min-w-0 items-center justify-between gap-1">
                <span className="min-w-0">{label}</span>
                <input aria-label={`Selector de ${label.toLowerCase()}`} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent" onChange={(event) => props.onBrandingChange(key, event.target.value.toUpperCase())} type="color" value={/^#[0-9A-Fa-f]{6}$/.test(props.branding[key]) ? props.branding[key] : '#71717A'} />
              </span>
              <AppInput aria-label={`Hexadecimal de ${label.toLowerCase()}`} className="min-w-0 px-2 py-2 font-mono text-xs uppercase" maxLength={7} onChange={(event) => props.onBrandingChange(key, event.target.value.toUpperCase())} spellCheck={false} value={props.branding[key]} />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['bodyFont', 'displayFont'] as const).map((key) => (
            <label className="grid gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-400" key={key}>
              <span>{key === 'bodyFont' ? 'Tipografía de cuerpo' : 'Tipografía de títulos'}</span>
              <AppSelect className="min-h-10 px-2.5 text-xs" onChange={(event) => props.onBrandingChange(key, event.target.value)} value={props.branding[key]}>
                {FONTS.map((font) => <option key={font} value={font}>{font}</option>)}
              </AppSelect>
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <AppButton disabled={props.savingBranding || !props.brandingValid} onClick={props.onSaveBranding} type="button">{props.savingBranding ? 'Guardando…' : 'Guardar paleta'}</AppButton>
        </div>
        {props.brandingFeedback && <FeedbackMessage kind={props.brandingFeedback.type} message={props.brandingFeedback.message} />}
      </div>
    </>
  );
}
